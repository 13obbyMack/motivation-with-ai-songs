'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VoiceSelectorProps, ElevenLabsVoice } from '@/types';
import { getVoices } from '@/utils/api';

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  apiKey,
  onVoiceSelected,
  selectedVoiceId,
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    if (!apiKey) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await getVoices(apiKey);
      if (response.success) {
        setVoices(response.voices);
      } else {
        setError(response.error || 'Failed to fetch voices');
      }
    } catch (err) {
      setError('Network error while fetching voices');
      console.error('Error fetching voices:', err);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  if (!apiKey) {
    return (
      <div className="p-4 bg-muted rounded-lg border-2 border-dashed border-border">
        <p className="text-muted-foreground text-center">
          Please provide your ElevenLabs API key to select a voice
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading available voices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-destructive font-medium">Error Loading Voices</h3>
            <p className="text-destructive text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchVoices}
            className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {voices.length} voices available
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {voices.map((voice) => (
          <div
            key={voice.voice_id}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedVoiceId === voice.voice_id
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-border hover:border-border/80'
            }`}
            onClick={() => onVoiceSelected(voice.voice_id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground truncate">{voice.name}</h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full ml-2 flex-shrink-0">
                {voice.category}
              </span>
            </div>
            
            {voice.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{voice.description}</p>
            )}

            <div className="flex items-center">
              {selectedVoiceId === voice.voice_id && (
                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              )}
              <span className="text-xs text-muted-foreground">
                {selectedVoiceId === voice.voice_id ? 'Selected' : 'Click to select'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {voices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No voices available.</p>
        </div>
      )}
    </div>
  );
};