import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, skipping auth initialization');
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please check your environment variables.') };
    }
    
    setIsAuthenticating(true);
    try {
      const redirectUrl = Platform.OS === 'web' 
        ? (typeof window !== 'undefined' && window.location ? window.location.origin : undefined)
        : 'https://1fc63d4e-6d35-4ee3-8df8-3a15e59444e6-00-3t0em6mh6h2bl.worf.replit.dev';
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      
      console.log('Sign up result:', { user: data?.user?.email, error: error?.message });
      
      if (!error && data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          return { error: new Error('An account with this email already exists.') };
        }
      }
      
      return { error };
    } catch (e) {
      console.error('Sign up exception:', e);
      return { error: e as Error };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please check your environment variables.') };
    }
    
    setIsAuthenticating(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in result:', { user: data?.user?.email, error: error?.message });
      
      if (error) {
        let userFriendlyMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          userFriendlyMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please check your email and confirm your account first.';
        }
        return { error: { ...error, message: userFriendlyMessage } as AuthError };
      }
      
      return { error: null };
    } catch (e) {
      console.error('Sign in exception:', e);
      return { error: e as Error };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please check your environment variables.') };
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please check your environment variables.') };
    }
    
    setIsAuthenticating(true);
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' && window.location ? window.location.origin : undefined,
          },
        });
        return { error };
      } else {
        const redirectUrl = makeRedirectUri();
        console.log('OAuth redirect URL:', redirectUrl);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });
        
        if (error) {
          return { error };
        }
        
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          
          if (result.type === 'success' && result.url) {
            try {
              const { params, errorCode } = QueryParams.getQueryParams(result.url);
              
              if (errorCode) {
                return { error: new Error(errorCode) };
              }
              
              const { access_token, refresh_token } = params;
              
              if (access_token && refresh_token) {
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                return { error: sessionError };
              }
            } catch (parseError) {
              console.error('Error parsing OAuth response:', parseError);
              return { error: new Error('Failed to process sign in response') };
            }
          }
          
          if (result.type === 'cancel' || result.type === 'dismiss') {
            return { error: new Error('Sign in was cancelled') };
          }
        }
        
        return { error: null };
      }
    } catch (e) {
      console.error('Google sign in exception:', e);
      return { error: e as Error };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!session,
        isAuthenticating,
        signUp,
        signIn,
        signOut,
        resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
