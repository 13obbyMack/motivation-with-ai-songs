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
 * Upload custom audio file directly to Vercel Blob storage (up to 50MB)
 */
export async function uploadAudio(audioFile: File, sessionId?: string): Promise<{
  audioData?: string;
  audioUrl?: string;
  duration: number;
  title: string;
  success: boolean;
  error?: string;
  deliveryMethod?: string;
  audioSize?: string;
  sessionId?: string;
}> {
  try {
    console.log(`Uploading ${audioFile.size} bytes (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB) directly to blob storage`);
    
    // Use @vercel/blob/client for direct browser-to-blob upload
    const { upload } = await import('@vercel/blob/client');
    
    // Create a unique filename with session-based folder structure
    const timestamp = Date.now();
    const sanitizedFilename = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `custom-audio/${sessionId}/${sanitizedFilename}-${timestamp}.mp3`;
    
    console.log(`Uploading to blob storage: ${pathname}`);
    
    // Upload directly to Vercel Blob from the browser
    // This bypasses the serverless function's 4.5MB limit
    const blob = await upload(pathname, audioFile, {
      access: 'public',
      handleUploadUrl: `${API_BASE_URL}/api/upload-audio`,
    });
    
    console.log(`✅ Upload successful: ${blob.url}`);
    
    // Fetch the uploaded file to convert to base64 for processing
    console.log(`Fetching uploaded audio from blob URL: ${blob.url}`);
    const audioResponse = await fetch(blob.url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch uploaded audio from blob storage: ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`Uploaded audio ArrayBuffer size: ${audioBuffer.byteLength} bytes`);
    
    // Convert ArrayBuffer to base64 efficiently
    const audioBase64 = await new Promise<string>((resolve, reject) => {
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const reader = new FileReader();
      reader.onload = () => {
        const readerResult = reader.result as string;
        if (!readerResult || typeof readerResult !== 'string') {
          reject(new Error('FileReader returned invalid result'));
          return;
        }
        const base64 = readerResult.split(',')[1];
        if (!base64) {
          reject(new Error('Failed to extract base64 from data URL'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(audioBlob);
    });
    
    return {
      audioData: audioBase64,
      audioUrl: blob.url,
      duration: 0, // Duration will be calculated during processing
      title: audioFile.name,
      success: true,
      deliveryMethod: 'blob',
      audioSize: `${(audioFile.size / (1024 * 1024)).toFixed(2)}MB`,
      sessionId: sessionId,
    };
  } catch (error) {
    console.error('Failed to upload audio:', error);
    return {
      duration: 0,
      title: audioFile.name,
      success: false,
      error: `Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      deliveryMethod: 'error',
    };
  }
}

/**
 * Extract audio from YouTube URL
 */
export async function extractAudio(youtubeUrl: string, youtubeCookies?: string, sessionId?: string): Promise<{
  audioData?: string;
  audioUrl?: string;
  duration: number;
  title: string;
  success: boolean;
  error?: string;
  deliveryMethod?: string;
  audioSize?: string;
  sessionId?: string;
}> {
  const response = await apiRequest<{
    audioUrl?: string;
    duration: number;
    title: string;
    success: boolean;
    error?: string;
    deliveryMethod?: string;
    audioSize?: string;
    sessionId?: string;
  }>("/api/extract-audio", {
    method: "POST",
    body: JSON.stringify({ youtubeUrl, youtubeCookies, sessionId }),
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
  sessionId?: string,
  outputFormat?: string
): Promise<{
  audioData?: string;
  audioUrl?: string;
  deliveryMethod: 'blob' | 'error';
  audioSize?: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}> {
  const response = await apiRequest<{
    audioUrl?: string;
    deliveryMethod: 'blob' | 'error';
    audioSize?: string;
    success: boolean;
    error?: string;
    sessionId?: string;
  }>("/api/generate-speech", {
    method: "POST",
    body: JSON.stringify({
      apiKey,
      text,
      voiceId,
      settings,
      modelId,
      outputFormat,
      sessionId,
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
  musicDuration?: number,
  sessionId?: string
): Promise<{
  finalAudio?: string;
  finalAudioUrl?: string;
  success: boolean;
  error?: string;
  deliveryMethod?: string;
  audioSize?: string;
  sessionId?: string;
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
    sessionId?: string;
  } = {
    spliceMode,
    crossfadeDuration,
    musicDuration,
    sessionId,
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
    sessionId?: string;
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


