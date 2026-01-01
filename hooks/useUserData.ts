// =============================================================================
// useUserData HOOK
// =============================================================================
// 
// This hook provides access to shared user data (profile and financial).
// It uses the UserDataContext to ensure all screens share the same state.
// When one screen updates data, all other screens see the change immediately.
//
// =============================================================================

import { useUserDataContext } from '../context/UserDataContext';

export function useUserData() {
  return useUserDataContext();
}
