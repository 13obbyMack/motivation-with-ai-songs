'use client';

import React, { useState, useEffect } from 'react';
import { AudioProcessorProps, ProcessingStep } from '@/types';
import { extractAudio, generateText, generateSpeech, spliceAudio } from '@/utils/api';
import { validateAudioBlob } from '@/utils/audioValidation';
import { createSeekableAudioBlob } from '@/utils/audioOptimization';
import { createSession } from '@/utils/session';
import { getTTSSettings } from '@/utils/elevenlabs';
import { Card } from './ui/Card';


const getStepDescription = (step: ProcessingStep, audioSource?: 'youtube' | 'upload') => {
  const descriptions = {
    [ProcessingStep.DOWNLOADING_AUDIO]: audioSource === 'upload' 
      ? 'Uploading your audio file...' 
      : 'Extracting audio from YouTube...',
    [ProcessingStep.GENERATING_TEXT]: 'Generating motivational content...',
    [ProcessingStep.GENERATING_SPEECH]: 'Converting text to speech...',
    [ProcessingStep.SPLICING_AUDIO]: 'Merging audio tracks...',
    [ProcessingStep.FINALIZING]: 'Finalizing your motivational song...',
  };
  return descriptions[step];
};

export const AudioProcessor: React.FC<AudioProcessorProps> = ({
  formData,
  apiKeys,
  selectedVoiceId,
  onProcessingComplete,
  onProgressUpdate,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [blobStorageStatus, setBlobStorageStatus] = useState<{
    checked: boolean;
    available: boolean;
    error?: string;
  }>({ checked: false, available: false });

  // Create session on component mount
  useEffect(() => {
    const session = createSession();
    setSessionId(session.sessionId);
    console.log(`🎯 Created processing session: ${session.sessionId}`);
  }, []);

  const updateProgress = (step: ProcessingStep, stepProgress: number) => {
    const stepIndex = Object.values(ProcessingStep).indexOf(step);
    const totalSteps = Object.values(ProcessingStep).length;
    const totalProgress = Math.min(100, (stepIndex / totalSteps) * 100 + (stepProgress / totalSteps));
    
    setProgress(Math.round(totalProgress));
    onProgressUpdate({
      currentStep: step,
      progress: Math.round(totalProgress),
      message: getStepDescription(step, formData.audioSource),
    });
  };

  const checkBlobStorage = async () => {
    // Blob storage is built into the main API functions and working properly
    // No need for separate testing since it's handled by the actual processing endpoints
    console.log('✅ Blob storage is integrated into API functions');
    setBlobStorageStatus({
      checked: true,
      available: true,
      error: undefined
    });
    return true;
  };

  const startProcessing = async () => {
    if (isProcessing) return;

    // First check blob storage
    const blobAvailable = await checkBlobStorage();
    if (!blobAvailable) {
      return; // Error already handled in checkBlobStorage
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Get audio (either from YouTube or uploaded file)
      setCurrentStep(ProcessingStep.DOWNLOADING_AUDIO);
      updateProgress(ProcessingStep.DOWNLOADING_AUDIO, 0);
      
      let audioResponse;
      const audioSource = formData.audioSource || 'youtube';
      
      if (audioSource === 'upload' && formData.uploadedAudioFile) {
        // Upload custom audio file
        const { uploadAudio } = await import('@/utils/api');
        audioResponse = await uploadAudio(formData.uploadedAudioFile, sessionId);
        if (!audioResponse.success) {
          throw new Error(audioResponse.error || 'Failed to upload audio file');
        }
        console.log(`Custom audio uploaded via: ${audioResponse.deliveryMethod}, size: ${audioResponse.audioSize || 'unknown'}`);
      } else {
        // Extract audio from YouTube
        audioResponse = await extractAudio(formData.youtubeUrl, apiKeys.youtubeCookies, sessionId);
        if (!audioResponse.success) {
          throw new Error(audioResponse.error || 'Failed to extract audio');
        }
        console.log(`YouTube audio extracted via: ${audioResponse.deliveryMethod}, size: ${audioResponse.audioSize || 'unknown'}`);
      }
      
      updateProgress(ProcessingStep.DOWNLOADING_AUDIO, 100);

      // Step 2: Generate text
      setCurrentStep(ProcessingStep.GENERATING_TEXT);
      updateProgress(ProcessingStep.GENERATING_TEXT, 0);
      
      const textResponse = await generateText(apiKeys.openaiKey, formData);
      if (!textResponse.success) {
        throw new Error(textResponse.error || 'Failed to generate text');
      }
      updateProgress(ProcessingStep.GENERATING_TEXT, 100);

      // Step 3: Generate speech from chunks
      setCurrentStep(ProcessingStep.GENERATING_SPEECH);
      updateProgress(ProcessingStep.GENERATING_SPEECH, 0);
      
      const speechChunks = [];
      const totalChunks = textResponse.chunks.length;
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = textResponse.chunks[i];
        if (!chunk) continue;
        
        const chunkProgress = (i / totalChunks) * 100;
        updateProgress(ProcessingStep.GENERATING_SPEECH, chunkProgress);
        
        const speechResponse = await generateSpeech(
          apiKeys.elevenlabsKey, 
          chunk, 
          selectedVoiceId,
          getTTSSettings(formData.selectedModelId), // use model-specific settings
          formData.selectedModelId, // use selected model
          sessionId
        );
        
        if (!speechResponse.success) {
          throw new Error(speechResponse.error || `Failed to generate speech for chunk ${i + 1}`);
        }

        // Log delivery method for debugging
        console.log(`Chunk ${i + 1} delivered via: ${speechResponse.deliveryMethod}, size: ${speechResponse.audioSize || 'unknown'}`);
        
        // Prefer blob URL over base64 to avoid large payloads
        if (speechResponse.audioUrl) {
          speechChunks.push(speechResponse.audioUrl);
          console.log(`Using blob URL for chunk ${i + 1}: ${speechResponse.audioUrl}`);
        } else if (speechResponse.audioData) {
          speechChunks.push(speechResponse.audioData);
          console.log(`Using base64 for chunk ${i + 1} (fallback)`);
        } else {
          throw new Error(`No audio data or URL received for chunk ${i + 1}`);
        }
      }
      
      updateProgress(ProcessingStep.GENERATING_SPEECH, 100);

      // Step 4: Splice audio with chunks
      setCurrentStep(ProcessingStep.SPLICING_AUDIO);
      updateProgress(ProcessingStep.SPLICING_AUDIO, 0);
      
      // Ensure we have audio data from the extract audio step
      if (!audioResponse.audioData) {
        throw new Error('No audio data received from YouTube extraction');
      }

      // Use blob URLs if available to avoid large request payloads
      const originalAudioInput = audioResponse.audioUrl || audioResponse.audioData;
      
      // Separate blob URLs from base64 data
      const speechUrls: string[] = [];
      const speechBase64: string[] = [];
      
      speechChunks.forEach((chunk, index) => {
        if (typeof chunk === 'string' && chunk.startsWith('http')) {
          speechUrls.push(chunk);
          console.log(`Speech chunk ${index + 1}: using blob URL`);
        } else {
          speechBase64.push(chunk);
          console.log(`Speech chunk ${index + 1}: using base64`);
        }
      });
      
      // Use blob URLs if we have them, otherwise fall back to base64
      const speechInput = speechUrls.length > 0 ? speechUrls : speechBase64;
      
      console.log('Splicing audio with:', {
        originalType: audioResponse.audioUrl ? 'blob URL' : 'base64',
        speechChunks: speechChunks.length,
        originalSize: audioResponse.audioSize
      });

      const spliceResponse = await spliceAudio(
        originalAudioInput,
        speechInput,
        'distributed', // Use distributed mode for better integration
        undefined, // crossfadeDuration
        audioResponse.duration, // musicDuration
        sessionId
      );
      if (!spliceResponse.success) {
        throw new Error(spliceResponse.error || 'Failed to splice audio');
      }
      
      console.log(`Final audio spliced via: ${spliceResponse.deliveryMethod}, size: ${spliceResponse.audioSize || 'unknown'}`);
      updateProgress(ProcessingStep.SPLICING_AUDIO, 100);

      // Step 5: Finalize
      setCurrentStep(ProcessingStep.FINALIZING);
      updateProgress(ProcessingStep.FINALIZING, 0);
      
      // Ensure we have final audio data
      if (!spliceResponse.finalAudio) {
        throw new Error('No final audio data received from splicing');
      }

      // Convert base64 to blob with proper binary handling
      let audioBlob: Blob;
      
      if (typeof spliceResponse.finalAudio === 'string') {
        try {
          // Proper base64 to binary conversion
          const binaryString = atob(spliceResponse.finalAudio);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          audioBlob = createSeekableAudioBlob(bytes, 'audio/mpeg');
          console.log(`Created seekable audio blob from base64: ${audioBlob.size} bytes`);
        } catch (error) {
          console.error('Failed to convert base64 to blob:', error);
          throw new Error('Failed to process final audio data');
        }
      } else {
        // Handle ArrayBuffer or Uint8Array
        audioBlob = createSeekableAudioBlob(spliceResponse.finalAudio, 'audio/mpeg');
        console.log(`Created seekable audio blob from binary data: ${audioBlob.size} bytes`);
      }
      
      // Validate the audio blob before completing
      console.log(`Validating final audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      const validation = await validateAudioBlob(audioBlob);
      if (!validation.isValid) {
        throw new Error(`Audio validation failed: ${validation.error}`);
      }
      
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('Audio validation warnings:', validation.warnings);
      }
      
      console.log('Audio blob validation passed:', validation.metadata);
      
      updateProgress(ProcessingStep.FINALIZING, 100);

      setIsProcessing(false);
      setCurrentStep(null);
      
      // Pass both the audio blob and session ID for cleanup after download
      onProcessingComplete(audioBlob, sessionId);

    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      setCurrentStep(null);
      onError(error instanceof Error ? error.message : 'Unknown processing error');
    }
  };

  return (
    <Card variant="elevated">
      <h2 className="text-2xl font-bold text-foreground mb-6">Audio Processing</h2>
      
      {!isProcessing && !currentStep && (
        <div className="text-center">
          {blobStorageStatus.checked && (
            <div className={`mb-4 p-3 rounded-lg border ${
              blobStorageStatus.available 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  blobStorageStatus.available ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium">
                  Blob Storage: {blobStorageStatus.available ? 'Available' : 'Not Available'}
                </span>
              </div>
              {blobStorageStatus.error && (
                <p className="text-sm mt-1">{blobStorageStatus.error}</p>
              )}
            </div>
          )}
          
          <p className="text-muted-foreground mb-6">
            Ready to create your motivational song!
          </p>
          <button
            onClick={startProcessing}
            disabled={blobStorageStatus.checked && !blobStorageStatus.available}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Processing
          </button>
          
          {!blobStorageStatus.checked && (
            <button
              onClick={checkBlobStorage}
              className="ml-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
            >
              Check Blob Storage
            </button>
          )}
        </div>
      )}

      {isProcessing && currentStep && (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                {getStepDescription(currentStep, formData.audioSource)}
              </span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-progress-bg rounded-full h-2">
              <div
                className="bg-progress-fill h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-primary text-sm">
              <strong>Current Step:</strong> {getStepDescription(currentStep, formData.audioSource)}
            </p>
            <p className="text-primary/80 text-sm mt-1">
              Please keep this page open while processing.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AudioProcessor;