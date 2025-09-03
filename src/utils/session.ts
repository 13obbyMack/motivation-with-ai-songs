/**
 * Session management utilities for organizing user files in Vercel blob storage
 */

import { v4 as uuidv4 } from 'uuid';

export interface SessionInfo {
  sessionId: string;
  timestamp: number;
  userId?: string;
}

/**
 * Generate a unique session identifier with UUID + timestamp
 */
export function generateSessionId(): string {
  const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
  const timestamp = Date.now();
  return `${timestamp}-${uuid}`;
}

/**
 * Create session info object
 */
export function createSession(userId?: string): SessionInfo {
  return {
    sessionId: generateSessionId(),
    timestamp: Date.now(),
    userId
  };
}

/**
 * Get session folder paths for different audio types
 */
export function getSessionPaths(sessionId: string) {
  return {
    youtubeAudio: `youtube-audio/${sessionId}`,
    ttsAudio: `tts-audio/${sessionId}`,
    finalAudio: `final-audio/${sessionId}`
  };
}

/**
 * Extract session ID from blob URL
 */
export function extractSessionIdFromUrl(blobUrl: string): string | null {
  try {
    // Extract filename from URL
    const url = new URL(blobUrl);
    const pathname = url.pathname;
    
    // Look for session ID pattern in path segments
    const segments = pathname.split('/');
    for (const segment of segments) {
      // Match timestamp-uuid pattern
      if (/^\d{13}-[a-f0-9]{8}$/.test(segment)) {
        return segment;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if session is expired (older than 24 hours)
 */
export function isSessionExpired(sessionId: string): boolean {
  try {
    const parts = sessionId.split('-');
    if (parts.length < 2 || !parts[0]) {
      return true; // Invalid format
    }
    
    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) {
      return true; // Invalid timestamp
    }
    
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return (now - timestamp) > twentyFourHours;
  } catch {
    return true; // Consider invalid session IDs as expired
  }
}

/**
 * Generate cleanup request payload for session
 */
export function createCleanupRequest(sessionId: string) {
  const paths = getSessionPaths(sessionId);
  
  return {
    sessionId,
    paths: [
      paths.youtubeAudio,
      paths.ttsAudio,
      paths.finalAudio
    ]
  };
}