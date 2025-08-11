'use client';

import React, { useState } from 'react';
import { AudioProcessorProps, ProcessingStep } from '@/types';
import { extractAudio, generateText, generateSpeech, spliceAudio } from '@/utils/api';


const STEP_DESCRIPTIONS = {
  [ProcessingStep.DOWNLOADING_AUDIO]: 'Extracting audio from YouTube...',
  [ProcessingStep.GENERATING_TEXT]: 'Generating motivational content...',
  [ProcessingStep.GENERATING_SPEECH]: 'Converting text to speech...',
  [ProcessingStep.SPLICING_AUDIO]: 'Merging audio tracks...',
  [ProcessingStep.FINALIZING]: 'Finalizing your motivational song...',
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

  const updateProgress = (step: ProcessingStep, stepProgress: number) => {
    const stepIndex = Object.values(ProcessingStep).indexOf(step);
    const totalSteps = Object.values(ProcessingStep).length;
    const totalProgress = Math.min(100, (stepIndex / totalSteps) * 100 + (stepProgress / totalSteps));
    
    setProgress(Math.round(totalProgress));
    onProgressUpdate({
      currentStep: step,
      progress: Math.round(totalProgress),
      message: STEP_DESCRIPTIONS[step],
    });
  };

  const startProcessing = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Step 1: Extract audio
      setCurrentStep(ProcessingStep.DOWNLOADING_AUDIO);
      updateProgress(ProcessingStep.DOWNLOADING_AUDIO, 0);
      
      const audioResponse = await extractAudio(formData.youtubeUrl);
      if (!audioResponse.success) {
        throw new Error(audioResponse.error || 'Failed to extract audio');
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
          undefined, // settings
          formData.selectedModelId // use selected model
        );
        
        if (!speechResponse.success) {
          throw new Error(speechResponse.error || `Failed to generate speech for chunk ${i + 1}`);
        }
        
        speechChunks.push(speechResponse.audioData);
      }
      
      updateProgress(ProcessingStep.GENERATING_SPEECH, 100);

      // Step 4: Splice audio with chunks
      setCurrentStep(ProcessingStep.SPLICING_AUDIO);
      updateProgress(ProcessingStep.SPLICING_AUDIO, 0);
      
      const spliceResponse = await spliceAudio(
        audioResponse.audioData,
        speechChunks,
        'distributed', // Use distributed mode for better integration
        audioResponse.duration
      );
      if (!spliceResponse.success) {
        throw new Error(spliceResponse.error || 'Failed to splice audio');
      }
      updateProgress(ProcessingStep.SPLICING_AUDIO, 100);

      // Step 5: Finalize
      setCurrentStep(ProcessingStep.FINALIZING);
      updateProgress(ProcessingStep.FINALIZING, 0);
      
      // Convert base64 to blob
      const audioData = typeof spliceResponse.finalAudio === 'string' 
        ? atob(spliceResponse.finalAudio)
        : new Uint8Array(spliceResponse.finalAudio);
      
      const audioBlob = typeof audioData === 'string'
        ? new Blob([new Uint8Array([...audioData].map(c => c.charCodeAt(0)))], { type: 'audio/mpeg' })
        : new Blob([audioData], { type: 'audio/mpeg' });
      
      updateProgress(ProcessingStep.FINALIZING, 100);

      setIsProcessing(false);
      setCurrentStep(null);
      onProcessingComplete(audioBlob);

    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      setCurrentStep(null);
      onError(error instanceof Error ? error.message : 'Unknown processing error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audio Processing</h2>
      
      {!isProcessing && !currentStep && (
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Ready to create your motivational song!
          </p>
          <button
            onClick={startProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Processing
          </button>
        </div>
      )}

      {isProcessing && currentStep && (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {STEP_DESCRIPTIONS[currentStep]}
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Current Step:</strong> {STEP_DESCRIPTIONS[currentStep]}
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Please keep this page open while processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioProcessor;