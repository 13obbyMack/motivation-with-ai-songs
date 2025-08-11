// Simplified audio utilities

// Validate YouTube URL
export function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
  return youtubeRegex.test(url.trim());
}

// Extract YouTube video ID from URL
export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match?.[1] || null;
}

// Format duration in seconds to MM:SS
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Convert ArrayBuffer to Blob
export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string = 'audio/mpeg'): Blob {
  return new Blob([buffer], { type: mimeType });
}

// Create download URL for blob
export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

// Clean up download URL
export function cleanupDownloadUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// Generate filename for audio download
export function generateAudioFilename(
  name: string, 
  activity: string,
  songTitle?: string,
  extension: string = 'mp3'
): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  
  const parts = [
    sanitize(name),
    sanitize(activity),
    'motivation'
  ];
  
  if (songTitle) {
    parts.splice(2, 0, sanitize(songTitle));
  }
  
  return `${parts.join('_')}_${timestamp}.${extension}`;
}

// Estimate audio duration from buffer size (rough approximation)
export function estimateAudioDuration(bufferSize: number, bitrate: number = 192): number {
  // Rough calculation: duration = (file_size_bytes * 8) / (bitrate_kbps * 1000)
  return Math.round((bufferSize * 8) / (bitrate * 1000));
}

// Convert base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = createDownloadUrl(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  cleanupDownloadUrl(url);
}

// Basic audio validation
export function validateAudioData(audioData: ArrayBuffer): boolean {
  return audioData && audioData.byteLength > 0;
}