import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const MODEL_NAME = 'gemini-2.0-flash';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

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

export function getGeminiModel(modelName: string = MODEL_NAME): GenerativeModel | null {
  const client = getGeminiClient();
  if (!client) return null;

  if (!model) {
    model = client.getGenerativeModel({ model: modelName });
  }

  return model;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContent(prompt: string): Promise<string | null> {
  const geminiModel = getGeminiModel();
  if (!geminiModel) {
    return null;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      const status = error?.status;
      
      if (status === 429 && attempt < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[Gemini] Rate limited, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(retryDelay);
        continue;
      }
      
      console.error(`[Gemini] Error generating content (attempt ${attempt + 1}):`, error?.message || error);
      return null;
    }
  }

  return null;
}

export async function generateJSON<T>(prompt: string): Promise<T | null> {
  try {
    const text = await generateContent(prompt);
    if (!text) return null;

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    return JSON.parse(jsonString.trim()) as T;
  } catch (error) {
    console.error('[Gemini] Error parsing JSON response:', error);
    return null;
  }
}
