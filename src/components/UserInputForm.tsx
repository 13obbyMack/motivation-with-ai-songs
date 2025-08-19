'use client';

import React, { useState } from 'react';
import { UserFormData, UserInputFormProps, ElevenLabsModel } from '@/types';
import { validateUserFormData } from '@/utils/validation';
import { VoiceSelector } from './VoiceSelector';
import { ModelSelector } from './ModelSelector';
import { selectOptimalModel } from '@/utils/elevenlabs';
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
  const [formData, setFormData] = useState<UserFormData>({
    name: initialData.name || '',
    characterPrompt: initialData.characterPrompt || '',
    selectedVoiceId: initialData.selectedVoiceId || '',
    selectedModelId: initialData.selectedModelId || selectOptimalModel('quality'),
    physicalActivity: initialData.physicalActivity || '',
    customInstructions: initialData.customInstructions || '',
    songTitle: initialData.songTitle || '',
    sponsor: initialData.sponsor || '',
    youtubeUrl: initialData.youtubeUrl || ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof UserFormData, value: string | ElevenLabsModel) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]); // Clear errors when user types
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
            onModelSelected={(modelId) => handleInputChange('selectedModelId', modelId)}
            selectedModel={formData.selectedModelId}
          />
        </div>

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

        {/* YouTube URL Field */}
        <Input
          label="YouTube Music URL"
          id="youtubeUrl"
          type="url"
          value={formData.youtubeUrl}
          onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isLoading}
          required
          helperText="Paste the URL of the YouTube video with the music you want to use"
        />

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