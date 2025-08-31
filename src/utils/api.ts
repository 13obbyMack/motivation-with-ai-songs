/**
 * API utility functions for communicating with Python serverless functions
 */

import { UserFormData } from "@/types";

// API URL configuration - same domain for Vercel functions
const API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";

/**
 * Make API request to Python backend
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Return the actual error message from the API
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Extract audio from YouTube URL
 */
export async function extractAudio(youtubeUrl: string, youtubeCookies?: string): Promise<{
  audioData?: string;
  audioUrl?: string;
  duration: number;
  title: string;
  success: boolean;
  error?: string;
  deliveryMethod?: string;
  audioSize?: string;
}> {
  const response = await apiRequest<{
    audioUrl?: string;
    duration: number;
    title: string;
    success: boolean;
    error?: string;
    deliveryMethod?: string;
    audioSize?: string;
  }>("/api/extract-audio", {
    method: "POST",
    body: JSON.stringify({ youtubeUrl, youtubeCookies }),
  });

  // All responses should be blob URLs now
  if (response.success && response.audioUrl) {
    try {
      console.log(`Fetching YouTube audio from blob URL: ${response.audioUrl}`);
      const audioResponse = await fetch(response.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch YouTube audio from blob storage: ${audioResponse.statusText}`);
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      console.log(`YouTube audio ArrayBuffer size: ${audioBuffer.byteLength} bytes`);
      
      // Convert ArrayBuffer to base64 efficiently
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (!result || typeof result !== 'string') {
            reject(new Error('FileReader returned invalid result'));
            return;
          }
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Failed to extract base64 from data URL'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
      return {
        ...response,
        audioData: audioBase64,
      };
    } catch (error) {
      console.error('Failed to fetch YouTube audio from blob URL:', error);
      return {
        ...response,
        success: false,
        error: `Failed to fetch YouTube audio from blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  return response;
}

/**
 * Generate motivational text using OpenAI
 */
export async function generateText(
  apiKey: string,
  userData: UserFormData
): Promise<{
  motivationalText: string;
  chunks: string[];
  success: boolean;
  error?: string;
}> {
  return apiRequest("/api/generate-text", {
    method: "POST",
    body: JSON.stringify({ apiKey, userData }),
  });
}

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices(apiKey: string): Promise<{
  voices: Array<{
    voice_id: string;
    name: string;
    category: string;
    description?: string;
    preview_url?: string;
  }>;
  success: boolean;
  error?: string;
}> {
  return apiRequest("/api/get-voices", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

/**
 * Generate speech using ElevenLabs TTS
 */
export async function generateSpeech(
  apiKey: string,
  text: string,
  voiceId: string,
  settings?: unknown,
  modelId?: string,
  outputFormat?: string
): Promise<{
  audioData?: string;
  audioUrl?: string;
  deliveryMethod: 'blob' | 'error';
  audioSize?: string;
  success: boolean;
  error?: string;
}> {
  const response = await apiRequest<{
    audioUrl?: string;
    deliveryMethod: 'blob' | 'error';
    audioSize?: string;
    success: boolean;
    error?: string;
  }>("/api/generate-speech", {
    method: "POST",
    body: JSON.stringify({
      apiKey,
      text,
      voiceId,
      settings,
      modelId,
      outputFormat,
    }),
  });

  // All responses should be blob URLs now
  if (response.success && response.audioUrl) {
    try {
      console.log(`Fetching audio from blob URL: ${response.audioUrl}`);
      console.log(`Audio size from API: ${response.audioSize || 'unknown'}`);
      
      const audioResponse = await fetch(response.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from blob storage: ${audioResponse.statusText}`);
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      console.log(`ArrayBuffer size: ${audioBuffer.byteLength} bytes (${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);
      
      // Convert ArrayBuffer to base64 efficiently
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (!result || typeof result !== 'string') {
            reject(new Error('FileReader returned invalid result'));
            return;
          }
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Failed to extract base64 from data URL'));
            return;
          }
          console.log(`Converted to base64: ${base64.length} characters`);
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
      return {
        ...response,
        audioData: audioBase64,
        deliveryMethod: 'blob' as const,
      };
    } catch (error) {
      console.error('Failed to fetch audio from blob URL:', error);
      return {
        ...response,
        success: false,
        error: `Failed to fetch audio from blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deliveryMethod: 'error' as const,
      };
    }
  }

  return response;
}

/**
 * Splice speech audio with background music
 */
export async function spliceAudio(
  originalAudio: string,
  speechAudio: string | string[],
  spliceMode: "intro" | "random" | "distributed" = "intro",
  crossfadeDuration?: number,
  musicDuration?: number
): Promise<{
  finalAudio?: string;
  finalAudioUrl?: string;
  success: boolean;
  error?: string;
  deliveryMethod?: string;
  audioSize?: string;
}> {
  // Determine if originalAudio is a blob URL or base64
  const isOriginalBlobUrl = originalAudio.startsWith('http');
  
  // Determine if speechAudio contains blob URLs or base64 data
  const speechArray = Array.isArray(speechAudio) ? speechAudio : [speechAudio];
  const hasSpeechUrls = speechArray.length > 0 && speechArray[0] && speechArray[0].startsWith('http');
  
  const requestBody: {
    spliceMode: string;
    crossfadeDuration?: number;
    musicDuration?: number;
    originalAudio?: string;
    originalAudioUrl?: string;
    speechAudio?: string | string[];
    speechAudioUrls?: string[];
  } = {
    spliceMode,
    crossfadeDuration,
    musicDuration,
  };
  
  // Send blob URL or base64 data accordingly for original audio
  if (isOriginalBlobUrl) {
    requestBody.originalAudioUrl = originalAudio;
    console.log('Sending original audio as blob URL to avoid large payload');
  } else {
    requestBody.originalAudio = originalAudio;
    console.log('Sending original audio as base64 (fallback)');
  }
  
  // Send blob URLs or base64 data accordingly for speech audio
  if (hasSpeechUrls) {
    requestBody.speechAudioUrls = speechArray;
    console.log(`Sending ${speechArray.length} speech chunks as blob URLs to avoid large payload`);
  } else {
    requestBody.speechAudio = speechAudio;
    console.log(`Sending ${speechArray.length} speech chunks as base64 (fallback)`);
  }
  
  const response = await apiRequest<{
    finalAudioUrl?: string;
    success: boolean;
    error?: string;
    deliveryMethod?: string;
    audioSize?: string;
  }>("/api/splice-audio", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // All responses should be blob URLs now
  if (response.success && response.finalAudioUrl) {
    try {
      console.log(`Fetching final audio from blob URL: ${response.finalAudioUrl}`);
      const audioResponse = await fetch(response.finalAudioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch final audio from blob storage: ${audioResponse.statusText}`);
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      console.log(`Final audio ArrayBuffer size: ${audioBuffer.byteLength} bytes`);
      
      // Convert ArrayBuffer to base64 efficiently
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (!result || typeof result !== 'string') {
            reject(new Error('FileReader returned invalid result'));
            return;
          }
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Failed to extract base64 from data URL'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
      return {
        ...response,
        finalAudio: audioBase64,
      };
    } catch (error) {
      console.error('Failed to fetch final audio from blob URL:', error);
      return {
        ...response,
        success: false,
        error: `Failed to fetch final audio from blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  return response;
}


