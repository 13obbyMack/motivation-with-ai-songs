// Simplified API utilities

import { 
  ExtractAudioRequest, 
  ExtractAudioResponse,
  GenerateTextRequest,
  GenerateTextResponse,
  GetVoicesRequest,
  GetVoicesResponse,
  GenerateSpeechRequest,
  GenerateSpeechResponse,
  SpliceAudioRequest,
  SpliceAudioResponse,
  UserFormData,
  TTSSettings
} from '@/types';

// Basic retry utility for network errors
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Extract audio from YouTube
export async function extractAudio(youtubeUrl: string): Promise<ExtractAudioResponse> {
  const request: ExtractAudioRequest = { youtubeUrl };
  
  return withRetry(async () => {
    const response = await fetch('/api/extract-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  });
}

// Generate motivational text
export async function generateText(apiKey: string, userData: unknown): Promise<GenerateTextResponse> {
  const request: GenerateTextRequest = { apiKey, userData: userData as UserFormData };
  
  return withRetry(async () => {
    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  });
}

// Get available voices
export async function getVoices(apiKey: string): Promise<GetVoicesResponse> {
  const request: GetVoicesRequest = { apiKey };
  
  return withRetry(async () => {
    const response = await fetch('/api/get-voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  });
}

// Generate speech from text
export async function generateSpeech(
  apiKey: string, 
  text: string, 
  voiceId: string,
  settings?: unknown,
  modelId?: string,
  outputFormat?: string
): Promise<GenerateSpeechResponse> {
  const request: GenerateSpeechRequest = { 
    apiKey, 
    text, 
    voiceId, 
    settings: settings as TTSSettings | undefined,
    modelId,
    outputFormat
  };
  
  return withRetry(async () => {
    const response = await fetch('/api/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  });
}

// Splice audio files together
export async function spliceAudio(
  originalAudio: string, // Now expects base64 string
  speechAudio: string | string[], // Now expects base64 string(s)
  spliceMode: 'intro' | 'random' | 'distributed' = 'intro',
  musicDuration?: number,
  crossfadeDuration?: number
): Promise<SpliceAudioResponse> {
  const request: SpliceAudioRequest = { 
    originalAudio,
    speechAudio,
    spliceMode, 
    crossfadeDuration,
    musicDuration
  };
  
  return withRetry(async () => {
    const response = await fetch('/api/splice-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  });
}