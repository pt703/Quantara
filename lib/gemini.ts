import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const MODEL_NAME = 'gemini-2.0-flash';
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 5000;
const MIN_REQUEST_INTERVAL_MS = 4000;

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

let lastRateLimitTime = 0;
const RATE_LIMIT_COOLDOWN_MS = 60000;

let lastRequestTime = 0;

type QueueItem = {
  prompt: string;
  resolve: (value: string | null) => void;
};
const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export function isRateLimited(): boolean {
  return Date.now() - lastRateLimitTime < RATE_LIMIT_COOLDOWN_MS;
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

async function executeRequest(prompt: string): Promise<string | null> {
  if (isRateLimited()) {
    console.log('[Gemini] Skipping request - in cooldown period after rate limit');
    return null;
  }

  const geminiModel = getGeminiModel();
  if (!geminiModel) {
    return null;
  }

  const timeSinceLastRequest = Date.now() - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    console.log(`[Gemini] Spacing requests, waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      lastRequestTime = Date.now();
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      console.log('[Gemini] Request successful');
      return response.text();
    } catch (error: any) {
      const status = error?.status;
      
      if (status === 429) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Gemini] Rate limited, retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(retryDelay);
          lastRequestTime = Date.now();
          continue;
        }
        lastRateLimitTime = Date.now();
        console.log('[Gemini] Rate limited after all retries. Entering 60s cooldown.');
        return null;
      }
      
      console.error(`[Gemini] Error (attempt ${attempt + 1}):`, error?.message || error);
      return null;
    }
  }

  return null;
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    if (isRateLimited()) {
      const remaining = requestQueue.splice(0);
      remaining.forEach(item => item.resolve(null));
      break;
    }

    const item = requestQueue.shift()!;
    const result = await executeRequest(item.prompt);
    item.resolve(result);
  }

  isProcessingQueue = false;
}

export async function generateContent(prompt: string): Promise<string | null> {
  if (isRateLimited()) {
    console.log('[Gemini] Skipping request - in cooldown period after rate limit');
    return null;
  }

  if (!getGeminiModel()) {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    requestQueue.push({ prompt, resolve });
    processQueue();
  });
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
