import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!GEMINI_API_KEY) {
    console.log('Gemini API key not configured');
    return null;
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return genAI;
}

export function getGeminiModel(modelName: string = 'gemini-1.5-flash'): GenerativeModel | null {
  const client = getGeminiClient();
  if (!client) return null;

  if (!model) {
    model = client.getGenerativeModel({ model: modelName });
  }

  return model;
}

export async function generateContent(prompt: string): Promise<string | null> {
  try {
    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      return null;
    }

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    return null;
  }
}

export async function generateJSON<T>(prompt: string): Promise<T | null> {
  try {
    const text = await generateContent(prompt);
    if (!text) return null;

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    return JSON.parse(jsonString.trim()) as T;
  } catch (error) {
    console.error('Error parsing Gemini JSON response:', error);
    return null;
  }
}
