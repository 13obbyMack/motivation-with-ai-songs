/**
 * Utility functions for API validation
 */

export const FILE_SIZE_LIMITS = {
  // 10MB total limit for better user experience
  MAX_TOTAL_SIZE: 10 * 1024 * 1024,
  // Vercel's serverless function limit
  VERCEL_LIMIT: 4.5 * 1024 * 1024,
} as const;

/**
 * Validates file size and returns appropriate error response data
 */
export function validateFileSize(
  size: number,
  filename?: string
): { isValid: boolean; error?: string; statusCode?: number } {
  if (size > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
    return {
      isValid: false,
      error: `File${filename ? ` "${filename}"` : ''} is too large (${(size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is 10MB.`,
      statusCode: 413,
    };
  }

  // Warn if approaching Vercel's limit but still allow processing
  if (size > FILE_SIZE_LIMITS.VERCEL_LIMIT) {
    console.warn(
      `File${filename ? ` "${filename}"` : ''} size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds Vercel's 4.5MB serverless limit. Processing may fail.`
    );
  }

  return { isValid: true };
}

/**
 * Validates total payload size for multiple files
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
export function validateAPIKeys(keys: { openaiKey: string; elevenlabsKey: string }): {
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