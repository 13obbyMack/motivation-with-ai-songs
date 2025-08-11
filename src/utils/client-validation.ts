/**
 * Client-side validation utilities for file uploads and processing
 */

export const FILE_SIZE_LIMITS = {
  MAX_TOTAL_SIZE: 10 * 1024 * 1024, // 10MB
  VERCEL_LIMIT: 4.5 * 1024 * 1024,  // 4.5MB
} as const;

/**
 * Validates file size on the client side before upload
 */
export function validateClientFileSize(file: File): { isValid: boolean; error?: string } {
  if (file.size > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" is too large (${formatBytes(file.size)}). Maximum allowed size is 10MB.`,
    };
  }

  if (file.size > FILE_SIZE_LIMITS.VERCEL_LIMIT) {
    console.warn(
      `File "${file.name}" size (${formatBytes(file.size)}) may cause processing issues on Vercel.`
    );
  }

  return { isValid: true };
}

/**
 * Validates multiple files total size
 */
export function validateMultipleFiles(files: File[]): { isValid: boolean; error?: string } {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
    return {
      isValid: false,
      error: `Total file size (${formatBytes(totalSize)}) exceeds 10MB limit. Please use smaller files.`,
    };
  }

  return { isValid: true };
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
 * Estimates processing time based on file size and operation type
 */
export function estimateProcessingTime(
  fileSizeBytes: number,
  operation: 'extract' | 'splice' | 'generate'
): string {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  
  let baseTime: number;
  switch (operation) {
    case 'extract':
      baseTime = Math.max(10, sizeMB * 3); // ~3 seconds per MB, min 10s
      break;
    case 'splice':
      baseTime = Math.max(15, sizeMB * 5); // ~5 seconds per MB, min 15s
      break;
    case 'generate':
      baseTime = Math.max(5, sizeMB * 2); // ~2 seconds per MB, min 5s
      break;
    default:
      baseTime = 30;
  }

  if (baseTime < 30) {
    return 'Less than 30 seconds';
  } else if (baseTime < 60) {
    return `About ${Math.round(baseTime)} seconds`;
  } else {
    return `About ${Math.round(baseTime / 60)} minute${Math.round(baseTime / 60) > 1 ? 's' : ''}`;
  }
}

/**
 * Creates a progress callback for long-running operations
 */
export function createProgressCallback(
  onProgress: (progress: number, message: string) => void
) {
  let currentProgress = 0;
  
  return {
    start: (message = 'Starting...') => {
      currentProgress = 0;
      onProgress(0, message);
    },
    update: (progress: number, message: string) => {
      currentProgress = Math.max(currentProgress, Math.min(100, progress));
      onProgress(currentProgress, message);
    },
    complete: (message = 'Complete!') => {
      onProgress(100, message);
    },
    error: (message = 'An error occurred') => {
      onProgress(currentProgress, message);
    }
  };
}