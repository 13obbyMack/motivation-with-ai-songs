'use client';

import React, { useState } from 'react';
import { UserFormData, UserInputFormProps, ElevenLabsModel } from '@/types';
import { validateUserFormData } from '@/utils/validation';
import { VoiceSelector } from './VoiceSelector';
import { ModelSelector } from './ModelSelector';
import { selectOptimalModel } from '@/utils/elevenlabs';

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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Motivational Song</h2>
      
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
          <ul className="text-red-600 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            disabled={isLoading}
            required
          />
        </div>

        {/* Character Prompt Field */}
        <div>
          <label htmlFor="characterPrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Character Prompt *
          </label>
          <textarea
            id="characterPrompt"
            value={formData.characterPrompt}
            onChange={(e) => handleInputChange('characterPrompt', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the character/persona you want for your motivational speaker. For example: 'You are a tough military drill sergeant who pushes people to their limits with discipline and no-nonsense attitude' or 'You are an energetic life coach who uses positive psychology and uplifting language to inspire action'"
            disabled={isLoading}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Define the personality, speaking style, and approach you want your motivational speaker to have
          </p>
        </div>

        {/* Model Selection Field */}
        <div>
          <ModelSelector
            onModelSelected={(modelId) => handleInputChange('selectedModelId', modelId)}
            selectedModel={formData.selectedModelId}
          />
        </div>

        {/* Voice Selection Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Voice *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Choose an ElevenLabs voice that matches your character
          </p>
          <VoiceSelector
            apiKey={elevenlabsApiKey}
            onVoiceSelected={(voiceId) => handleInputChange('selectedVoiceId', voiceId)}
            selectedVoiceId={formData.selectedVoiceId}
          />
        </div>

        {/* Physical Activity Field */}
        <div>
          <label htmlFor="physicalActivity" className="block text-sm font-medium text-gray-700 mb-1">
            Physical Activity *
          </label>
          <input
            type="text"
            id="physicalActivity"
            value={formData.physicalActivity}
            onChange={(e) => handleInputChange('physicalActivity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Running, Weightlifting, Boxing"
            disabled={isLoading}
            required
          />
        </div>

        {/* YouTube URL Field */}
        <div>
          <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 mb-1">
            YouTube Music URL *
          </label>
          <input
            type="url"
            id="youtubeUrl"
            value={formData.youtubeUrl}
            onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isLoading}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Paste the URL of the YouTube video with the music you want to use
          </p>
        </div>

        {/* Custom Instructions Field */}
        <div>
          <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Custom Instructions (Optional)
          </label>
          <textarea
            id="customInstructions"
            value={formData.customInstructions}
            onChange={(e) => handleInputChange('customInstructions', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any specific instructions or themes you want included..."
            disabled={isLoading}
          />
        </div>

        {/* Song Title Field */}
        <div>
          <label htmlFor="songTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Song Title (Optional)
          </label>
          <input
            type="text"
            id="songTitle"
            value={formData.songTitle}
            onChange={(e) => handleInputChange('songTitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Name of the song (optional)"
            disabled={isLoading}
          />
        </div>

        {/* Sponsor Field */}
        <div>
          <label htmlFor="sponsor" className="block text-sm font-medium text-gray-700 mb-1">
            Sponsor (Optional)
          </label>
          <input
            type="text"
            id="sponsor"
            value={formData.sponsor}
            onChange={(e) => handleInputChange('sponsor', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Sponsor name (optional)"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? 'Processing...' : 'Create Motivational Song'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserInputForm;