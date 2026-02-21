'use client';

import React, { useState } from 'react';
import { UserFormData, UserInputFormProps, ElevenLabsModel, TTSSettings } from '@/types';
import { validateUserFormData } from '@/utils/validation';
import { VoiceSelector } from './VoiceSelector';
import { ModelSelector } from './ModelSelector';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { selectOptimalModel, getBaselineTTSSettings } from '@/utils/elevenlabs';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';

export const UserInputForm: React.FC<UserInputFormProps> = ({
  onSubmit,
  isLoading,
  initialData = {},
  elevenlabsApiKey = ''
}) => {
  const defaultModelId = initialData.selectedModelId || selectOptimalModel('quality');
  const [formData, setFormData] = useState<UserFormData>({
    name: initialData.name || '',
    characterPrompt: initialData.characterPrompt || '',
    selectedVoiceId: initialData.selectedVoiceId || '',
    selectedModelId: defaultModelId,
    physicalActivity: initialData.physicalActivity || '',
    customInstructions: initialData.customInstructions || '',
    songTitle: initialData.songTitle || '',
    sponsor: initialData.sponsor || '',
    youtubeUrl: initialData.youtubeUrl || '',
    audioSource: initialData.audioSource || 'youtube',
    uploadedAudioFile: initialData.uploadedAudioFile,
    voiceSettings: initialData.voiceSettings || getBaselineTTSSettings(defaultModelId),
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const handleInputChange = (field: keyof UserFormData, value: string | ElevenLabsModel | File | TTSSettings) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]); // Clear errors when user types
  };

  const handleModelChange = (modelId: ElevenLabsModel) => {
    setFormData(prev => ({
      ...prev,
      selectedModelId: modelId,
      voiceSettings: getBaselineTTSSettings(modelId),
    }));
    setErrors([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
        setErrors(['Please upload a valid MP3 file']);
        return;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrors([`File size must be less than 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`]);
        return;
      }
      
      setUploadedFileName(file.name);
      handleInputChange('uploadedAudioFile', file);
      setErrors([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateUserFormData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <Card className="max-w-2xl mx-auto" variant="elevated">
      <h2 className="text-2xl font-bold text-foreground mb-6">Create Your Motivational Song</h2>
      
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h3 className="text-destructive font-medium mb-2">Please fix the following errors:</h3>
          <ul className="text-destructive text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <Input
          label="Your Name"
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your name"
          disabled={isLoading}
          required
        />

        {/* Character Prompt Field */}
        <Textarea
          label="Character Prompt"
          id="characterPrompt"
          value={formData.characterPrompt}
          onChange={(e) => handleInputChange('characterPrompt', e.target.value)}
          rows={4}
          placeholder="Describe the character/persona you want for your motivational speaker. For example: 'You are a tough military drill sergeant who pushes people to their limits with discipline and no-nonsense attitude' or 'You are an energetic life coach who uses positive psychology and uplifting language to inspire action'"
          disabled={isLoading}
          required
          helperText="Define the personality, speaking style, and approach you want your motivational speaker to have"
        />

        {/* Model Selection Field */}
        <div>
          <ModelSelector
            onModelSelected={handleModelChange}
            selectedModel={formData.selectedModelId}
          />
        </div>

        {/* Voice Settings */}
        <VoiceSettingsPanel
          modelId={formData.selectedModelId}
          settings={formData.voiceSettings || {}}
          onChange={(settings) => handleInputChange('voiceSettings', settings)}
          disabled={isLoading}
        />

        {/* Voice Selection Field */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Select Voice *
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Choose an ElevenLabs voice that matches your character
          </p>
          <VoiceSelector
            apiKey={elevenlabsApiKey}
            onVoiceSelected={(voiceId) => handleInputChange('selectedVoiceId', voiceId)}
            selectedVoiceId={formData.selectedVoiceId}
          />
        </div>

        {/* Physical Activity Field */}
        <Input
          label="Physical Activity"
          id="physicalActivity"
          value={formData.physicalActivity}
          onChange={(e) => handleInputChange('physicalActivity', e.target.value)}
          placeholder="e.g., Running, Weightlifting, Boxing"
          disabled={isLoading}
          required
        />

        {/* Audio Source Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Background Music Source *
          </label>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="audioSource"
                value="youtube"
                checked={formData.audioSource === 'youtube'}
                onChange={(e) => handleInputChange('audioSource', e.target.value as 'youtube' | 'upload')}
                disabled={isLoading}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-foreground">YouTube URL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="audioSource"
                value="upload"
                checked={formData.audioSource === 'upload'}
                onChange={(e) => handleInputChange('audioSource', e.target.value as 'youtube' | 'upload')}
                disabled={isLoading}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-foreground">Upload MP3 File</span>
            </label>
          </div>

          {/* YouTube URL Field */}
          {formData.audioSource === 'youtube' && (
            <Input
              label=""
              id="youtubeUrl"
              type="url"
              value={formData.youtubeUrl}
              onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isLoading}
              required
              helperText="Paste the URL of the YouTube video with the music you want to use"
            />
          )}

          {/* File Upload Field */}
          {formData.audioSource === 'upload' && (
            <div>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="audioFile"
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors cursor-pointer"
                >
                  Choose MP3 File
                </label>
                <input
                  type="file"
                  id="audioFile"
                  accept="audio/mpeg,.mp3"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                {uploadedFileName && (
                  <span className="text-sm text-muted-foreground">
                    {uploadedFileName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload your own MP3 file (max 50MB) to use as background music
              </p>
            </div>
          )}
        </div>

        {/* Custom Instructions Field */}
        <Textarea
          label="Custom Instructions (Optional)"
          id="customInstructions"
          value={formData.customInstructions}
          onChange={(e) => handleInputChange('customInstructions', e.target.value)}
          rows={3}
          placeholder="Any specific instructions or themes you want included..."
          disabled={isLoading}
        />

        {/* Song Title Field */}
        <Input
          label="Song Title (Optional)"
          id="songTitle"
          value={formData.songTitle}
          onChange={(e) => handleInputChange('songTitle', e.target.value)}
          placeholder="Name of the song (optional)"
          disabled={isLoading}
        />

        {/* Sponsor Field */}
        <Input
          label="Sponsor (Optional)"
          id="sponsor"
          value={formData.sponsor}
          onChange={(e) => handleInputChange('sponsor', e.target.value)}
          placeholder="Sponsor name (optional)"
          disabled={isLoading}
        />

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            loadingText="Processing..."
            fullWidth
            size="lg"
          >
            Create Motivational Song
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default UserInputForm;