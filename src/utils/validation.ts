/**
 * Utility functions for API validation
 */

export const FILE_SIZE_LIMITS = {
  // Removed size limits since we use blob storage
  // Keep for reference but don't enforce
  REFERENCE_VERCEL_LIMIT: 4.5 * 1024 * 1024,
} as const;

/**
 * Validates file size - Now just logs for reference since we use blob storage
 */
export function validateFileSize(
  size: number,
  filename?: string
): { isValid: boolean; error?: string; statusCode?: number } {
  // Since we use blob storage, we don't enforce size limits
  // Just log for monitoring purposes
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  console.log(`File${filename ? ` "${filename}"` : ''} size: ${sizeMB}MB (blob storage handles all sizes)`);

  return { isValid: true };
}

/**
 * Validates total payload size for multiple files - Now just logs since we use blob storage
 */
export function validateTotalPayloadSize(
  sizes: number[]
): { isValid: boolean; error?: string; statusCode?: number } {
  const totalSize = sizes.reduce((sum, size) => sum + size, 0);
  return validateFileSize(totalSize, 'Total payload');
}

/**
 * Converts base64 string to Buffer with validation
 */
export function convertBase64ToBuffer(
  base64Data: string,
  filename?: string
): { buffer?: Buffer; error?: string; statusCode?: number } {
  if (typeof base64Data !== 'string') {
    return {
      error: `Expected base64 string${filename ? ` for "${filename}"` : ''}, received: ${typeof base64Data}`,
      statusCode: 400,
    };
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const validation = validateFileSize(buffer.length, filename);
    
    if (!validation.isValid) {
      return {
        error: validation.error,
        statusCode: validation.statusCode,
      };
    }

    return { buffer };
  } catch {
    return {
      error: `Invalid base64 data${filename ? ` for "${filename}"` : ''}`,
      statusCode: 400,
    };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validates API keys format and structure
 */
export function validateAPIKeys(keys: { openaiKey: string; elevenlabsKey: string; youtubeCookies?: string }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!keys.openaiKey || keys.openaiKey.trim().length === 0) {
    errors.push('OpenAI API key is required');
  } else if (!keys.openaiKey.startsWith('sk-')) {
    errors.push('OpenAI API key must start with "sk-"');
  }

  if (!keys.elevenlabsKey || keys.elevenlabsKey.trim().length === 0) {
    errors.push('ElevenLabs API key is required');
  }

  // Validate YouTube cookies format if provided
  if (keys.youtubeCookies && keys.youtubeCookies.trim()) {
    const cookiesContent = keys.youtubeCookies.trim();
    if (!cookiesContent.includes('# HTTP Cookie File') && !cookiesContent.includes('# Netscape HTTP Cookie File')) {
      errors.push('YouTube cookies must be in Netscape format (should start with "# HTTP Cookie File" or "# Netscape HTTP Cookie File")');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes API key for display (shows only first/last few characters)
 */
export function sanitizeAPIKey(key: string): string {
  if (!key || key.length < 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * Validates user form data
 */
export function validateUserFormData(data: {
  name: string;
  characterPrompt: string;
  selectedVoiceId: string;
  physicalActivity: string;
  youtubeUrl: string;
  audioSource?: 'youtube' | 'upload';
  uploadedAudioFile?: File;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!data.characterPrompt || data.characterPrompt.trim().length === 0) {
    errors.push('Character prompt is required');
  }

  if (!data.selectedVoiceId || data.selectedVoiceId.trim().length === 0) {
    errors.push('Voice selection is required');
  }

  if (!data.physicalActivity || data.physicalActivity.trim().length === 0) {
    errors.push('Physical activity is required');
  }

  // Validate audio source
  const audioSource = data.audioSource || 'youtube';
  
  if (audioSource === 'youtube') {
    if (!data.youtubeUrl || data.youtubeUrl.trim().length === 0) {
      errors.push('YouTube URL is required');
    } else {
      // Basic URL validation
      try {
        const url = new URL(data.youtubeUrl);
        if (!url.hostname.includes('youtube.com') && !url.hostname.includes('youtu.be')) {
          errors.push('Please provide a valid YouTube URL');
        }
      } catch {
        errors.push('Please provide a valid YouTube URL');
      }
    }
  } else if (audioSource === 'upload') {
    if (!data.uploadedAudioFile) {
      errors.push('Please upload an MP3 file');
    } else {
      // Validate file type
      if (!data.uploadedAudioFile.type.includes('audio/mpeg') && 
          !data.uploadedAudioFile.name.toLowerCase().endsWith('.mp3')) {
        errors.push('Please upload a valid MP3 file');
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (data.uploadedAudioFile.size > maxSize) {
        errors.push('File size must be less than 50MB');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
/**
 
* Validates ElevenLabs API key format
 */
export function validateElevenLabsKey(key: string): boolean {
  return Boolean(key && key.trim().length > 0);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}