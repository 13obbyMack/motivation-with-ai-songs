"use client";

import React, { useState } from "react";
import { UserFormData, APIKeys, ProcessingProgress } from "@/types";
import { UserInputForm } from "./UserInputForm";
import { AudioProcessor } from "./AudioProcessor";
import { AudioPlayer } from "./AudioPlayer";
import { generateAudioFilename } from "@/utils/audio";

interface MotivationalSongWorkflowProps {
  apiKeys: APIKeys;
}

export const MotivationalSongWorkflow: React.FC<
  MotivationalSongWorkflowProps
> = ({ apiKeys }) => {
  const [currentStep, setCurrentStep] = useState<
    "form" | "processing" | "complete"
  >("form");
  const [formData, setFormData] = useState<UserFormData | null>(null);
  const [finalAudio, setFinalAudio] = useState<Blob | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = (data: UserFormData) => {
    setFormData(data);
    setCurrentStep("processing");
    setError(null);
  };

  const handleProcessingComplete = (audioBlob: Blob, processingSessionId?: string) => {
    setFinalAudio(audioBlob);
    setSessionId(processingSessionId || null);
    setCurrentStep("complete");
  };

  const handleProgressUpdate = (progress: ProcessingProgress) => {
    setProcessingProgress(progress);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentStep("form");
  };

  const handleReset = () => {
    setCurrentStep("form");
    setFormData(null);
    setFinalAudio(null);
    setSessionId(null);
    setProcessingProgress(null);
    setError(null);
  };

  const generateFilename = () => {
    if (!formData) return "motivational-song.mp3";
    return generateAudioFilename(
      formData.name,
      formData.physicalActivity,
      formData.songTitle
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div
          className={`flex items-center space-x-2 ${
            currentStep === "form"
              ? "text-primary"
              : currentStep === "processing" || currentStep === "complete"
              ? "text-success"
              : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "form"
                ? "bg-primary/20 border-2 border-primary"
                : currentStep === "processing" || currentStep === "complete"
                ? "bg-success/20 border-2 border-success"
                : "bg-muted border-2 border-border"
            }`}
          >
            <span className="text-sm font-bold">1</span>
          </div>
          <span className="font-medium">Setup</span>
        </div>

        <div
          className={`w-8 h-1 ${
            currentStep === "processing" || currentStep === "complete"
              ? "bg-success"
              : "bg-border"
          }`}
        ></div>

        <div
          className={`flex items-center space-x-2 ${
            currentStep === "processing"
              ? "text-primary"
              : currentStep === "complete"
              ? "text-success"
              : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "processing"
                ? "bg-primary/20 border-2 border-primary"
                : currentStep === "complete"
                ? "bg-success/20 border-2 border-success"
                : "bg-muted border-2 border-border"
            }`}
          >
            <span className="text-sm font-bold">2</span>
          </div>
          <span className="font-medium">Processing</span>
        </div>

        <div
          className={`w-8 h-1 ${
            currentStep === "complete" ? "bg-success" : "bg-border"
          }`}
        ></div>

        <div
          className={`flex items-center space-x-2 ${
            currentStep === "complete" ? "text-success" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "complete"
                ? "bg-success/20 border-2 border-success"
                : "bg-muted border-2 border-border"
            }`}
          >
            <span className="text-sm font-bold">3</span>
          </div>
          <span className="font-medium">Complete</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-red-800 font-medium">Processing Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === "form" && (
        <UserInputForm
          onSubmit={handleFormSubmit}
          isLoading={false}
          elevenlabsApiKey={apiKeys.elevenlabsKey}
          initialData={formData || {}}
        />
      )}

      {currentStep === "processing" && formData && (
        <AudioProcessor
          formData={formData}
          apiKeys={apiKeys}
          selectedVoiceId={formData.selectedVoiceId}
          onProcessingComplete={handleProcessingComplete}
          onProgressUpdate={handleProgressUpdate}
          onError={handleError}
        />
      )}

      {currentStep === "complete" && finalAudio && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-success mb-2">
              🎉 Your Motivational Song is Ready!
            </h2>
            <p className="text-muted-foreground">
              Your personalized motivational content has been created
              successfully.
            </p>
          </div>

          <AudioPlayer
            audioBlob={finalAudio}
            filename={generateFilename()}
            sessionId={sessionId || undefined}
            onDownload={() => {
              // Download is handled by AudioPlayer component
              console.log('Download completed');
            }}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
};

export default MotivationalSongWorkflow;
