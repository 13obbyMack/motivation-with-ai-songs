'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPlayerProps } from '@/types';
import { downloadBlob } from '@/utils/audio';
import { scheduleCleanup } from '@/utils/cleanup';
import { Card } from './ui/Card';
import AudioDebugger from './AudioDebugger';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  filename,
  onDownload,
  onReset,
  sessionId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio URL from blob with enhanced settings
  useEffect(() => {
    if (audioBlob) {
      // Create a more reliable blob URL for seeking
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [audioBlob]);

  // Update buffered ranges periodically
  useEffect(() => {
    const updateBuffered = () => {
      if (audioRef.current && audioRef.current.buffered) {
        setBufferedRanges(audioRef.current.buffered);
      }
    };

    const interval = setInterval(updateBuffered, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration || 0;
      setDuration(audioDuration);
      setIsLoading(false);
      setHasError(false);
      console.log(`Audio loaded successfully: ${audioDuration}s duration`);
      
      // Ensure the audio is seekable
      if (audioRef.current.seekable && audioRef.current.seekable.length > 0) {
        console.log(`Audio is seekable: 0s to ${audioRef.current.seekable.end(0)}s`);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      const newTime = audioRef.current.currentTime || 0;
      setCurrentTime(newTime);
      
      // Update buffered ranges
      if (audioRef.current.buffered) {
        setBufferedRanges(audioRef.current.buffered);
      }
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget;
    const error = audio.error;
    let errorMsg = 'Unknown audio error';
    
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMsg = 'Audio playback was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMsg = 'Network error occurred while loading audio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMsg = 'Audio file is corrupted or in an unsupported format';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = 'Audio format is not supported by your browser';
          break;
        default:
          errorMsg = `Audio error (code: ${error.code})`;
      }
    }
    
    console.error('Audio playback error:', errorMsg, error);
    setHasError(true);
    setErrorMessage(errorMsg);
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('Audio can start playing');
  };

  const handleWaiting = () => {
    console.log('Audio is buffering...');
    setIsBuffering(true);
  };

  const handleCanPlayThrough = () => {
    console.log('Audio can play through without buffering');
    setIsBuffering(false);
  };

  const handleStalled = () => {
    console.warn('Audio playback stalled - network issues?');
    setIsBuffering(true);
  };

  const handleSeeking = () => {
    console.log('Audio seeking started...');
    setIsSeeking(true);
    setIsBuffering(true);
  };

  const handleSeeked = () => {
    console.log('Audio seek completed');
    setIsSeeking(false);
    setIsBuffering(false);
    
    // Update current time after seek
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    
    // Clear any pending seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    
    setSeekTarget(null);
  };

  const seekToTime = useCallback((targetTime: number) => {
    if (!audioRef.current || hasError || !duration) return;
    
    // Clamp the target time to valid range
    const clampedTime = Math.max(0, Math.min(targetTime, duration));
    
    console.log(`Seeking to ${clampedTime.toFixed(2)}s (requested: ${targetTime.toFixed(2)}s)`);
    
    setSeekTarget(clampedTime);
    setIsSeeking(true);
    
    try {
      // Set the current time
      audioRef.current.currentTime = clampedTime;
      
      // Set a timeout to handle cases where seeked event doesn't fire
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      
      seekTimeoutRef.current = setTimeout(() => {
        console.warn('Seek timeout - forcing seek completion');
        setIsSeeking(false);
        setIsBuffering(false);
        setSeekTarget(null);
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 3000); // 3 second timeout
      
    } catch (error) {
      console.error('Seek error:', error);
      setIsSeeking(false);
      setSeekTarget(null);
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
    }
  }, [hasError, duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if the audio player is focused or no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (!audioRef.current || hasError) return;
          if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekToTime(currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekToTime(currentTime + 10);
          break;
        case 'Home':
          e.preventDefault();
          seekToTime(0);
          break;
        case 'End':
          e.preventDefault();
          seekToTime(duration);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentTime, duration, hasError, isPlaying, seekToTime]);

  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Reset to beginning if at the end
        if (audioRef.current.currentTime >= audioRef.current.duration) {
          seekToTime(0);
          // Wait a bit for seek to complete before playing
          setTimeout(async () => {
            if (audioRef.current) {
              await audioRef.current.play();
              setIsPlaying(true);
            }
          }, 100);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setHasError(true);
      setErrorMessage('Failed to play audio. Try refreshing the page.');
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      downloadBlob(audioBlob, filename);
      onDownload();
      
      // Schedule cleanup of session files after successful download
      if (sessionId) {
        console.log(`🧹 Scheduling cleanup for session: ${sessionId}`);
        scheduleCleanup(sessionId, 3000); // Clean up after 3 seconds
      }
    }
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioBlob) {
    return (
      <Card className="text-center">
        <p className="text-muted-foreground">No audio available</p>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onError={handleError}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlayThrough}
          onWaiting={handleWaiting}
          onStalled={handleStalled}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          onLoadStart={() => setIsLoading(true)}
          onProgress={() => {
            // Update buffered ranges when progress changes
            if (audioRef.current && audioRef.current.buffered) {
              setBufferedRanges(audioRef.current.buffered);
            }
          }}
        />
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Your Motivational Song
        </h3>
        <p className="text-sm text-muted-foreground">{filename}</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-gray-500 mt-1">
            Blob size: {(audioBlob.size / 1024 / 1024).toFixed(2)}MB | 
            Type: {audioBlob.type} | 
            Duration: {formatTime(duration)}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Keyboard: Space (play/pause), ← → (skip 10s), Home/End (start/end)
        </p>
      </div>

      <div className="space-y-4">
        {hasError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm font-medium">Audio Error</p>
            <p className="text-red-600 text-sm">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-red-700 text-sm underline hover:no-underline"
            >
              Refresh page to try again
            </button>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* Skip backward 10 seconds */}
          <button
            onClick={() => seekToTime(currentTime - 10)}
            disabled={isLoading || hasError || isSeeking}
            className="flex items-center justify-center w-10 h-10 bg-secondary hover:bg-secondary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-secondary-foreground rounded-full transition-colors"
            title="Skip back 10 seconds"
          >
            ⏪
          </button>
          
          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading || hasError}
            className="flex items-center justify-center w-12 h-12 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-primary-foreground rounded-full transition-colors"
          >
            {isLoading || isSeeking ? '⏳' : isPlaying ? '⏸️' : '▶️'}
          </button>
          
          {/* Skip forward 10 seconds */}
          <button
            onClick={() => seekToTime(currentTime + 10)}
            disabled={isLoading || hasError || isSeeking}
            className="flex items-center justify-center w-10 h-10 bg-secondary hover:bg-secondary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-secondary-foreground rounded-full transition-colors"
            title="Skip forward 10 seconds"
          >
            ⏩
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span className="font-mono">
                {formatTime(seekTarget ?? currentTime)}
                {isSeeking && seekTarget !== null && (
                  <span className="text-yellow-600 ml-1">→ {formatTime(seekTarget)}</span>
                )}
              </span>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
            
            <div className="relative">
              <div 
                className="w-full bg-progress-bg rounded-full h-3 cursor-pointer hover:h-4 transition-all"
                onClick={(e) => {
                  if (!audioRef.current || !duration || hasError || isSeeking) return;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                  const newTime = percentage * duration;
                  
                  seekToTime(newTime);
                }}
                onMouseMove={(e) => {
                  // Show preview time on hover
                  if (!duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                  const previewTime = percentage * duration;
                  e.currentTarget.title = `Seek to ${formatTime(previewTime)}`;
                }}
              >
                {/* Buffered progress */}
                {bufferedRanges && duration > 0 && (
                  <>
                    {Array.from({ length: bufferedRanges.length }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full bg-gray-300 rounded-full"
                        style={{
                          left: `${(bufferedRanges.start(i) / duration) * 100}%`,
                          width: `${((bufferedRanges.end(i) - bufferedRanges.start(i)) / duration) * 100}%`
                        }}
                      />
                    ))}
                  </>
                )}
                
                {/* Current progress */}
                <div
                  className="bg-progress-fill h-full rounded-full transition-all relative"
                  style={{ 
                    width: `${duration ? ((seekTarget ?? currentTime) / duration) * 100 : 0}%`,
                    opacity: isSeeking ? 0.7 : 1
                  }}
                >
                  {/* Seek indicator */}
                  <div 
                    className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-progress-fill rounded-full border-2 border-white shadow-md opacity-0 hover:opacity-100 transition-opacity"
                    style={{ opacity: isSeeking ? 1 : 0 }}
                  />
                </div>
                
                {/* Seeking indicator */}
                {isSeeking && seekTarget !== null && (
                  <div
                    className="absolute top-0 h-full w-1 bg-yellow-400 rounded-full"
                    style={{ left: `${(seekTarget / duration) * 100}%` }}
                  />
                )}
              </div>
              
              {/* Buffering indicator */}
              {isBuffering && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                    {isSeeking ? 'Seeking...' : 'Buffering...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleDownload}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground py-2 px-4 rounded-md font-medium transition-colors"
          >
            Download Song
          </button>
          
          {(hasError || isLoading) && (
            <button
              onClick={() => {
                if (audioRef.current) {
                  setHasError(false);
                  setErrorMessage('');
                  setIsLoading(true);
                  audioRef.current.load();
                }
              }}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium transition-colors"
            >
              Reload Audio
            </button>
          )}
          
          {onReset && (
            <button
              onClick={onReset}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 px-4 rounded-md font-medium transition-colors"
            >
              Create Another
            </button>
          )}
        </div>
        
        <AudioDebugger audioBlob={audioBlob} />
      </div>
    </Card>
  );
};

export default AudioPlayer;