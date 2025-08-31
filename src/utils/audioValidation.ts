/**
 * Audio validation utilities
 */

export interface AudioValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: {
    size: number;
    type: string;
    hasValidHeader: boolean;
  };
}

/**
 * Validate an audio blob for common issues that could cause playback problems
 */
export async function validateAudioBlob(blob: Blob): Promise<AudioValidationResult> {
  const warnings: string[] = [];
  
  // Check blob size
  if (blob.size === 0) {
    return {
      isValid: false,
      error: 'Audio blob is empty'
    };
  }
  
  if (blob.size < 1000) {
    warnings.push('Audio file is very small and may be corrupted');
  }
  
  // Check MIME type
  if (!blob.type || !blob.type.startsWith('audio/')) {
    warnings.push(`Unexpected MIME type: ${blob.type || 'none'}`);
  }
  
  // Check for valid audio file header
  let hasValidHeader = false;
  try {
    const headerBuffer = await blob.slice(0, 12).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    
    // Check for common audio file signatures
    // MP3: ID3 tag (0x49 0x44 0x33) or MPEG frame sync (0xFF 0xFB/0xFA)
    // WAV: RIFF header (0x52 0x49 0x46 0x46)
    // OGG: OggS header (0x4F 0x67 0x67 0x53)
    
    if (headerBytes.length >= 3) {
      // ID3 tag
      if (headerBytes[0] === 0x49 && headerBytes[1] === 0x44 && headerBytes[2] === 0x33) {
        hasValidHeader = true;
      }
      // MPEG frame sync
      else if (headerBytes[0] === 0xFF && (headerBytes[1] & 0xE0) === 0xE0) {
        hasValidHeader = true;
      }
    }
    
    if (headerBytes.length >= 4) {
      // RIFF/WAV header
      if (headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && 
          headerBytes[2] === 0x46 && headerBytes[3] === 0x46) {
        hasValidHeader = true;
      }
      // OggS header
      else if (headerBytes[0] === 0x4F && headerBytes[1] === 0x67 && 
               headerBytes[2] === 0x67 && headerBytes[3] === 0x53) {
        hasValidHeader = true;
      }
    }
    
    if (!hasValidHeader) {
      warnings.push('Audio file header not recognized - may not be a valid audio file');
    }
    
  } catch (error) {
    warnings.push('Could not read audio file header');
  }
  
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      size: blob.size,
      type: blob.type,
      hasValidHeader
    }
  };
}

/**
 * Create a test audio element to verify the blob can be loaded
 */
export function testAudioPlayback(blob: Blob): Promise<AudioValidationResult> {
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
        isValid: false,
        error: 'Audio loading timeout - file may be corrupted'
      });
    }, 10000); // 10 second timeout
    
    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      cleanup();
      
      if (audio.duration && audio.duration > 0) {
        resolve({
          isValid: true,
          metadata: {
            size: blob.size,
            type: blob.type,
            hasValidHeader: true
          }
        });
      } else {
        resolve({
          isValid: false,
          error: 'Audio file has no duration - may be corrupted'
        });
      }
    });
    
    audio.addEventListener('error', (e) => {
      clearTimeout(timeout);
      cleanup();
      
      const error = audio.error;
      let errorMessage = 'Unknown audio error';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio file is corrupted or in an unsupported format';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format is not supported by the browser';
            break;
          default:
            errorMessage = `Audio error (code: ${error.code})`;
        }
      }
      
      resolve({
        isValid: false,
        error: errorMessage
      });
    });
    
    audio.src = url;
    audio.load();
  });
}