/**
 * Client-side utilities for handling blob storage responses
 */

import { SpliceAudioResponse } from '@/types';

/**
 * Handles audio processing response that might include blob URLs
 */
export async function handleAudioResponse(
  response: SpliceAudioResponse
): Promise<{ audioBlob?: Blob; error?: string }> {
  if (!response.success) {
    return { error: response.error || 'Processing failed' };
  }

  try {
    // Handle blob URL response (for large files)
    if (response.blobUrl) {
      const blobResponse = await fetch(response.blobUrl);
      if (!blobResponse.ok) {
        return { error: `Failed to fetch audio from blob storage: ${blobResponse.statusText}` };
      }
      
      const audioBlob = await blobResponse.blob();
      return { audioBlob };
    }
    
    // Handle base64 response (for regular files)
    if (response.finalAudio && typeof response.finalAudio === 'string') {
      const audioBlob = base64ToBlob(response.finalAudio, 'audio/mpeg');
      return { audioBlob };
    }
    
    // Handle ArrayBuffer response
    if (response.finalAudio instanceof ArrayBuffer) {
      const audioBlob = new Blob([response.finalAudio], { type: 'audio/mpeg' });
      return { audioBlob };
    }
    
    return { error: 'No audio data received' };
  } catch (error) {
    console.error('Error handling audio response:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to process audio response' 
    };
  }
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Download blob from URL with automatic cleanup
 */
export async function downloadBlobFromUrl(
  url: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `Download failed: ${response.statusText}` };
    }
    
    const blob = await response.blob();
    downloadBlob(blob, filename);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading blob:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get file size category for UI feedback
 */
export function getFileSizeCategory(sizeBytes: number): {
  category: 'small' | 'medium' | 'large' | 'very-large';
  description: string;
  processingMethod: 'standard' | 'blob';
} {
  const sizeMB = sizeBytes / (1024 * 1024);
  
  if (sizeMB < 1) {
    return {
      category: 'small',
      description: 'Small file - fast processing',
      processingMethod: 'standard'
    };
  } else if (sizeMB < 4) {
    return {
      category: 'medium',
      description: 'Medium file - normal processing',
      processingMethod: 'standard'
    };
  } else if (sizeMB < 10) {
    return {
      category: 'large',
      description: 'Large file - may use blob storage',
      processingMethod: 'blob'
    };
  } else {
    return {
      category: 'very-large',
      description: 'Very large file - will use blob storage',
      processingMethod: 'blob'
    };
  }
}

/**
 * API client that automatically chooses the right endpoint based on file size
 */
export async function spliceAudioSmart(
  originalAudio: string,
  speechAudio: string | string[],
  spliceMode: string,
  totalSizeBytes: number
): Promise<SpliceAudioResponse> {
  // Choose endpoint based on file size
  const useBlob = totalSizeBytes > 4 * 1024 * 1024; // 4MB threshold
  const endpoint = useBlob ? '/api/splice-audio-blob' : '/api/splice-audio';
  
  console.log(`Using ${useBlob ? 'blob' : 'standard'} processing for ${(totalSizeBytes / 1024 / 1024).toFixed(2)}MB file`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originalAudio,
      speechAudio,
      spliceMode,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}