/**
 * Tests for session management utilities
 */

import { 
  generateSessionId, 
  createSession, 
  getSessionPaths, 
  extractSessionIdFromUrl, 
  isSessionExpired 
} from '../session';

describe('Session Management', () => {
  test('generateSessionId creates valid format', () => {
    const sessionId = generateSessionId();
    
    // Should match timestamp-uuid pattern
    expect(sessionId).toMatch(/^\d{13}-[a-f0-9]{8}$/);
    
    // Should be unique
    const sessionId2 = generateSessionId();
    expect(sessionId).not.toBe(sessionId2);
  });

  test('createSession returns valid session info', () => {
    const session = createSession('test-user');
    
    expect(session.sessionId).toMatch(/^\d{13}-[a-f0-9]{8}$/);
    expect(session.timestamp).toBeGreaterThan(0);
    expect(session.userId).toBe('test-user');
  });

  test('getSessionPaths returns correct folder structure', () => {
    const sessionId = '1234567890123-abcd1234';
    const paths = getSessionPaths(sessionId);
    
    expect(paths.youtubeAudio).toBe('youtube-audio/1234567890123-abcd1234');
    expect(paths.ttsAudio).toBe('tts-audio/1234567890123-abcd1234');
    expect(paths.finalAudio).toBe('final-audio/1234567890123-abcd1234');
  });

  test('extractSessionIdFromUrl extracts session ID correctly', () => {
    const testUrls = [
      'https://example.com/youtube-audio/1234567890123-abcd1234/file.mp3',
      'https://example.com/tts-audio/1234567890123-abcd1234/voice.mp3',
      'https://example.com/final-audio/1234567890123-abcd1234/final.mp3'
    ];
    
    testUrls.forEach(url => {
      const sessionId = extractSessionIdFromUrl(url);
      expect(sessionId).toBe('1234567890123-abcd1234');
    });
  });

  test('extractSessionIdFromUrl returns null for invalid URLs', () => {
    const invalidUrls = [
      'https://example.com/invalid/path',
      'https://example.com/youtube-audio/invalid-format/file.mp3',
      'not-a-url'
    ];
    
    invalidUrls.forEach(url => {
      const sessionId = extractSessionIdFromUrl(url);
      expect(sessionId).toBeNull();
    });
  });

  test('isSessionExpired correctly identifies expired sessions', () => {
    // Create a session ID from 25 hours ago
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
    const expiredSessionId = `${oldTimestamp}-abcd1234`;
    
    // Create a session ID from 1 hour ago
    const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000);
    const validSessionId = `${recentTimestamp}-abcd1234`;
    
    expect(isSessionExpired(expiredSessionId)).toBe(true);
    expect(isSessionExpired(validSessionId)).toBe(false);
    expect(isSessionExpired('invalid-format')).toBe(true);
  });
});