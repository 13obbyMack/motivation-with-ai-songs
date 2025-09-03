/**
 * Cleanup utilities for managing session-based blob storage
 */

/**
 * Clean up session files after successful download
 */
export async function cleanupSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🧹 Starting cleanup for session: ${sessionId}`);
    
    const response = await fetch('/api/cleanup-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Cleanup failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Session cleanup completed: ${sessionId}`);
      console.log(`   Files cleaned: ${result.filesDeleted || 0}`);
      console.log(`   Folders cleaned: ${result.foldersDeleted || 0}`);
    } else {
      console.warn(`⚠️ Session cleanup partially failed: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Session cleanup failed for ${sessionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown cleanup error'
    };
  }
}

/**
 * Clean up session with retry logic
 */
export async function cleanupSessionWithRetry(
  sessionId: string, 
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await cleanupSession(sessionId);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        console.log(`🔄 Cleanup attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (attempt < maxRetries) {
        console.log(`🔄 Cleanup attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }
  
  return {
    success: false,
    error: `Cleanup failed after ${maxRetries} attempts. Last error: ${lastError}`
  };
}

/**
 * Schedule cleanup to run after a delay (fire-and-forget)
 */
export function scheduleCleanup(sessionId: string, delayMs: number = 5000): void {
  setTimeout(async () => {
    try {
      await cleanupSessionWithRetry(sessionId);
    } catch (error) {
      console.error(`Scheduled cleanup failed for session ${sessionId}:`, error);
    }
  }, delayMs);
}