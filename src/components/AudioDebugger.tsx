'use client';

import React, { useState } from 'react';
import { validateAudioBlob, testAudioPlayback, AudioValidationResult } from '@/utils/audioValidation';
import { testSeekingCapability } from '@/utils/audioOptimization';

interface AudioDebuggerProps {
  audioBlob: Blob;
}

interface DebugInfo {
  validation?: AudioValidationResult;
  playbackTest?: AudioValidationResult;
  seekingTest?: {
    canSeek: boolean;
    seekableRanges: number;
    duration: number;
    error?: string;
  };
  blobUrl?: string;
  blobSize?: number;
  blobType?: string;
  timestamp?: string;
  error?: string;
}

export const AudioDebugger: React.FC<AudioDebuggerProps> = ({ audioBlob }) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const runDiagnostics = async () => {
    setIsDebugging(true);
    
    try {
      console.log('Running audio diagnostics...');
      
      // Basic validation
      const validation = await validateAudioBlob(audioBlob);
      
      // Playback test
      const playbackTest = await testAudioPlayback(audioBlob);
      
      // Seeking capability test
      const seekingTest = await testSeekingCapability(audioBlob);
      
      // Create object URL and test
      const url = URL.createObjectURL(audioBlob);
      
      setDebugInfo({
        validation,
        playbackTest,
        seekingTest,
        blobUrl: url,
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDebugging(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 border rounded-md">
      <h4 className="font-semibold text-sm mb-2">Audio Diagnostics (Dev Only)</h4>
      
      <button
        onClick={runDiagnostics}
        disabled={isDebugging}
        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isDebugging ? 'Running...' : 'Run Diagnostics'}
      </button>
      
      {debugInfo && (
        <div className="mt-3 text-xs">
          <pre className="bg-white p-2 rounded border overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AudioDebugger;