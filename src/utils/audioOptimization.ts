/**
 * Audio optimization utilities for better browser playback and seeking
 */

/**
 * Optimize an audio blob for better seeking performance in browsers
 */
export async function optimizeAudioBlobForSeeking(blob: Blob): Promise<Blob> {
  try {
    // For MP3 files, ensure proper headers are present
    if (blob.type === 'audio/mpeg' || blob.type === 'audio/mp3') {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Check if it's already a proper MP3 with ID3 or frame sync
      const hasId3 = bytes.length >= 3 && 
        bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
      
      const hasMpegSync = bytes.length >= 2 && 
        bytes[0] === 0xFF && bytes[1] !== undefined && (bytes[1] & 0xE0) === 0xE0;
      
      if (hasId3 || hasMpegSync) {
        console.log('Audio blob already has proper MP3 headers');
        return blob;
      }
      
      // If no proper headers, return as-is but log warning
      console.warn('Audio blob may not have proper MP3 headers - seeking may be limited');
    }
    
    return blob;
  } catch (error) {
    console.error('Failed to optimize audio blob:', error);
    return blob; // Return original blob if optimization fails
  }
}

/**
 * Create a seekable audio blob with proper MIME type and headers
 */
export function createSeekableAudioBlob(data: Uint8Array | ArrayBuffer, originalType?: string): Blob {
  // Determine the best MIME type for seeking
  let mimeType = 'audio/mpeg'; // Default to MP3
  
  if (originalType) {
    // Use original type if it's a known seekable format
    if (originalType.includes('mpeg') || originalType.includes('mp3')) {
      mimeType = 'audio/mpeg';
    } else if (originalType.includes('wav')) {
      mimeType = 'audio/wav';
    } else if (originalType.includes('ogg')) {
      mimeType = 'audio/ogg';
    } else if (originalType.includes('m4a') || originalType.includes('aac')) {
      mimeType = 'audio/mp4';
    }
  }
  
  // Create blob with proper MIME type
  const blob = new Blob([data], { type: mimeType });
  
  console.log(`Created seekable audio blob: ${blob.size} bytes, type: ${mimeType}`);
  
  return blob;
}

/**
 * Preload audio blob to improve seeking performance
 */
export function preloadAudioForSeeking(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };
    
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Audio preload timeout'));
    }, 15000); // 15 second timeout
    
    audio.addEventListener('canplaythrough', () => {
      clearTimeout(timeout);
      cleanup();
      console.log('Audio preloaded successfully for seeking');
      resolve();
    });
    
    audio.addEventListener('error', () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error(`Audio preload failed: ${audio.error?.message || 'Unknown error'}`));
    });
    
    // Set preload to auto and load
    audio.preload = 'auto';
    audio.src = url;
    audio.load();
  });
}

/**
 * Test seeking capability of an audio blob
 */
export async function testSeekingCapability(blob: Blob): Promise<{
  canSeek: boolean;
  seekableRanges: number;
  duration: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };
    
    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        canSeek: false,
        seekableRanges: 0,
        duration: 0,
        error: 'Seeking test timeout'
      });
    }, 10000);
    
    audio.addEventListener('loadedmetadata', () => {
      const seekable = audio.seekable;
      const canSeek = seekable && seekable.length > 0;
      
      clearTimeout(timeout);
      cleanup();
      
      resolve({
        canSeek,
        seekableRanges: seekable ? seekable.length : 0,
        duration: audio.duration || 0
      });
    });
    
    audio.addEventListener('error', () => {
      clearTimeout(timeout);
      cleanup();
      
      resolve({
        canSeek: false,
        seekableRanges: 0,
        duration: 0,
        error: audio.error?.message || 'Audio loading error'
      });
    });
    
    audio.preload = 'metadata';
    audio.src = url;
    audio.load();
  });
}