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
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Extract audio from YouTube URL
 */
export async function extractAudio(youtubeUrl: string): Promise<{
  audioData: string;
  duration: number;
  title: string;
  success: boolean;
  error?: string;
}> {
  return apiRequest("/api/extract-audio", {
    method: "POST",
    body: JSON.stringify({ youtubeUrl }),
  });
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
  audioData: string;
  success: boolean;
  error?: string;
}> {
  return apiRequest("/api/generate-speech", {
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
  finalAudio: string;
  success: boolean;
  error?: string;
}> {
  return apiRequest("/api/splice-audio", {
    method: "POST",
    body: JSON.stringify({
      originalAudio,
      speechAudio,
      spliceMode,
      crossfadeDuration,
      musicDuration,
    }),
  });
}
