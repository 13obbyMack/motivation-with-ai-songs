'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AudioPlayerProps } from '@/types';
import { downloadBlob } from '@/utils/audio';
import { Card } from './ui/Card';
import AudioDebugger from './AudioDebugger';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  filename,
  onDownload,
  onReset,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Create audio URL from blob
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    return undefined;
  }, [audioBlob]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setIsLoading(false);
      setHasError(false);
      console.log(`Audio loaded successfully: ${audioRef.current.duration}s duration`);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime || 0);
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
  };

  const handleStalled = () => {
    console.warn('Audio playback stalled - network issues?');
    // Try to recover by reloading the audio
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      audioRef.current.load();
      audioRef.current.currentTime = currentTime;
    }
  };

  const handleSeeking = () => {
    console.log('Audio seeking...');
  };

  const handleSeeked = () => {
    console.log('Audio seek completed');
  };

  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Reset to beginning if at the end
        if (audioRef.current.currentTime >= audioRef.current.duration) {
          audioRef.current.currentTime = 0;
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
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
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onError={handleError}
          onCanPlay={handleCanPlay}
          onWaiting={handleWaiting}
          onStalled={handleStalled}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          onLoadStart={() => setIsLoading(true)}
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
          <button
            onClick={togglePlayPause}
            disabled={isLoading || hasError}
            className="flex items-center justify-center w-12 h-12 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-primary-foreground rounded-full transition-colors"
          >
            {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            <div 
              className="w-full bg-progress-bg rounded-full h-2 cursor-pointer"
              onClick={(e) => {
                if (!audioRef.current || !duration || hasError) return;
                
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = percentage * duration;
                
                audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
              }}
            >
              <div
                className="bg-progress-fill h-2 rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
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