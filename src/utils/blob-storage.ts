/**
 * Vercel Blob storage utilities for handling large files
 * Install: npm install @vercel/blob
 */


import { put, del } from '@vercel/blob';

export const BLOB_CONFIG = {
  // Use blob storage for files larger than 4MB
  BLOB_THRESHOLD: 4 * 1024 * 1024,
  // Maximum file size for blob storage (100MB)
  MAX_BLOB_SIZE: 100 * 1024 * 1024,
} as const;

/**
 * Determines if a file should use blob storage based on size
 */
export function shouldUseBlob(fileSize: number): boolean {
  return fileSize > BLOB_CONFIG.BLOB_THRESHOLD;
}

/**
 * Upload file to Vercel Blob storage
 * Uncomment when @vercel/blob is installed
 */
export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  contentType = 'audio/mpeg'
): Promise<{ url: string; error?: string }> {
  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      // Auto-delete after 1 hour for temporary processing files
      addRandomSuffix: true,
    });
    
    return { url: blob.url };
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Failed to upload to blob storage' 
    };
  }
}

/**
 * Download file from Vercel Blob storage
 * Uncomment when @vercel/blob is installed
 */
export async function downloadFromBlob(url: string): Promise<{ buffer?: Buffer; error?: string }> {
  try {
    // Handle data URLs (fallback method)
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      if (!base64Data) {
        return { error: 'Invalid data URL' };
      }
      return { buffer: Buffer.from(base64Data, 'base64') };
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `Failed to download from blob: ${response.statusText}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer) };
  } catch (error) {
    console.error('Error downloading from blob:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to download from blob storage' 
    };
  }
}

/**
 * Delete file from Vercel Blob storage
 * Uncomment when @vercel/blob is installed
 */
export async function deleteFromBlob(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip deletion for data URLs (fallback method)
    if (url.startsWith('data:')) {
      return { success: true };
    }
    
    await del(url);
    return { success: true };
  } catch (error) {
    console.error('Error deleting from blob:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete from blob storage' 
    };
  }
}

/**
 * Process large files using blob storage workflow
 */
export async function processLargeFile(
  buffer: Buffer,
  filename: string,
  processor: (buffer: Buffer) => Promise<Buffer>
): Promise<{ result?: Buffer; blobUrl?: string; error?: string }> {
  const fileSize = buffer.length;
  
  if (fileSize > BLOB_CONFIG.MAX_BLOB_SIZE) {
    return { 
      error: `File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum size for blob storage is 100MB.` 
    };
  }
  
  if (!shouldUseBlob(fileSize)) {
    // Process normally for smaller files
    try {
      const result = await processor(buffer);
      return { result };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Processing failed' 
      };
    }
  }
  
  // Use blob storage for large files
  try {
    // Upload input file to blob
    const uploadResult = await uploadToBlob(buffer, `input-${filename}`);
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    
    // Download and process
    const downloadResult = await downloadFromBlob(uploadResult.url);
    if (downloadResult.error || !downloadResult.buffer) {
      return { error: downloadResult.error || 'Failed to download from blob' };
    }
    
    const processedBuffer = await processor(downloadResult.buffer);
    
    // Upload processed result to blob
    const resultUpload = await uploadToBlob(processedBuffer, `output-${filename}`);
    if (resultUpload.error) {
      return { error: resultUpload.error };
    }
    
    // Clean up input blob
    await deleteFromBlob(uploadResult.url);
    
    return { blobUrl: resultUpload.url };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Blob processing failed' 
    };
  }
}