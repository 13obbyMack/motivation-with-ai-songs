'use client';

import React, { useState, useEffect } from 'react';
import { ElevenLabsModel } from '@/types';
import { selectOptimalModel, MODEL_LIMITS } from '@/utils/elevenlabs';

interface ModelSelectorProps {
  onModelSelected: (modelId: ElevenLabsModel) => void;
  selectedModel?: ElevenLabsModel;
}

const MODEL_INFO = {
  eleven_multilingual_v2: {
    name: 'Multilingual v2',
    description: 'Best quality, most stable',
    speed: 'Slow',
    quality: 'Highest',
    languages: 29,
    recommended: 'Quality'
  },
  eleven_flash_v2_5: {
    name: 'Flash v2.5',
    description: 'Ultra-fast, low latency',
    speed: 'Fastest',
    quality: 'Good',
    languages: 32,
    recommended: 'Speed'
  },
  eleven_turbo_v2_5: {
    name: 'Turbo v2.5',
    description: 'Balanced quality and speed',
    speed: 'Fast',
    quality: 'High',
    languages: 32,
    recommended: 'Balanced'
  },
  eleven_v3: {
    name: 'v3 (Alpha)',
    description: 'Most expressive, experimental',
    speed: 'Medium',
    quality: 'Highest',
    languages: 70,
    recommended: 'Expressive'
  }
} as const;

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelSelected,
  selectedModel
}) => {
  const [currentModel, setCurrentModel] = useState<ElevenLabsModel>(
    selectedModel || selectOptimalModel('quality')
  );

  useEffect(() => {
    if (selectedModel) {
      setCurrentModel(selectedModel);
    }
  }, [selectedModel]);

  const handleModelChange = (modelId: ElevenLabsModel) => {
    setCurrentModel(modelId);
    onModelSelected(modelId);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Voice Model
        </label>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the ElevenLabs model that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(MODEL_INFO).map(([modelId, info]) => {
          const isSelected = currentModel === modelId;
          const characterLimit = MODEL_LIMITS[modelId as ElevenLabsModel];
          
          return (
            <div
              key={modelId}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/80'
              }`}
              onClick={() => handleModelChange(modelId as ElevenLabsModel)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">{info.name}</h3>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full m-0.5"></div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                <div>Speed: <span className="font-medium">{info.speed}</span></div>
                <div>Quality: <span className="font-medium">{info.quality}</span></div>
                <div>Languages: <span className="font-medium">{info.languages}</span></div>
                <div>Limit: <span className="font-medium">{characterLimit.toLocaleString()}</span></div>
              </div>

              <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                info.recommended === 'Quality' ? 'bg-success/20 text-success' :
                info.recommended === 'Speed' ? 'bg-primary/20 text-primary' :
                info.recommended === 'Balanced' ? 'bg-accent text-accent-foreground' :
                'bg-warning/20 text-warning'
              }`}>
                Best for: {info.recommended}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted p-3 rounded-lg">
        <h4 className="font-medium text-foreground mb-1">Selected: {MODEL_INFO[currentModel].name}</h4>
        <p className="text-sm text-muted-foreground">{MODEL_INFO[currentModel].description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Character limit: {MODEL_LIMITS[currentModel].toLocaleString()} characters
        </p>
      </div>
    </div>
  );
};

export default ModelSelector;