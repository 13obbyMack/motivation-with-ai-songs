'use client';

import React from 'react';
import { TTSSettings, ElevenLabsModel } from '@/types';

interface VoiceSettingsPanelProps {
  modelId: ElevenLabsModel;
  settings: TTSSettings;
  onChange: (settings: TTSSettings) => void;
  disabled?: boolean;
}

// Which settings each model supports
const MODEL_SUPPORT: Record<ElevenLabsModel, (keyof TTSSettings)[]> = {
  eleven_multilingual_v2: ['stability', 'similarity_boost', 'style', 'use_speaker_boost', 'speed'],
  eleven_flash_v2_5:      ['stability', 'similarity_boost', 'speed'],
  eleven_turbo_v2_5:      ['stability', 'similarity_boost', 'speed'],
  eleven_v3:              ['stability'], // v3 only supports stability (discrete values)
};

// v3 only allows discrete stability values
const V3_STABILITY_OPTIONS = [
  { value: 0.0, label: 'Creative (0.0)' },
  { value: 0.5, label: 'Natural (0.5)' },
  { value: 1.0, label: 'Robust (1.0)' },
];

const DEFAULTS: TTSSettings = {
  stability: 0.3,
  similarity_boost: 0.85,
  style: 0.0,
  use_speaker_boost: true,
  speed: 1.0,
};

function SliderField({
  label,
  id,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="text-sm text-muted-foreground tabular-nums">{value.toFixed(2)}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  modelId,
  settings,
  onChange,
  disabled,
}) => {
  const supported = MODEL_SUPPORT[modelId] ?? [];
  const isV3 = modelId === 'eleven_v3';

  const update = (key: keyof TTSSettings, value: number | boolean) => {
    onChange({ ...settings, [key]: value });
  };

  const s = { ...DEFAULTS, ...settings };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Voice Settings</label>
        <p className="text-xs text-muted-foreground">
          Fine-tune how the voice sounds. Defaults are optimised for motivational content.
        </p>
      </div>

      <div className="space-y-5 p-4 bg-muted/30 rounded-lg border border-border">
        {/* Stability */}
        {supported.includes('stability') && (
          isV3 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Stability</label>
              <p className="text-xs text-muted-foreground">v3 requires one of three discrete values.</p>
              <div className="flex gap-2 mt-2">
                {V3_STABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => update('stability', opt.value)}
                    className={`flex-1 py-1.5 text-xs rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      s.stability === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <SliderField
              label="Stability"
              id="stability"
              value={s.stability ?? 0.3}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update('stability', v)}
              disabled={disabled}
              hint="Lower = more expressive variation. Higher = more consistent delivery."
            />
          )
        )}

        {/* Similarity Boost */}
        {supported.includes('similarity_boost') && (
          <SliderField
            label="Similarity Boost"
            id="similarity_boost"
            value={s.similarity_boost ?? 0.85}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('similarity_boost', v)}
            disabled={disabled}
            hint="How closely the output matches the original voice."
          />
        )}

        {/* Style */}
        {supported.includes('style') && (
          <SliderField
            label="Style"
            id="style"
            value={s.style ?? 0.0}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('style', v)}
            disabled={disabled}
            hint="Amplifies the voice's style. Higher values may reduce stability."
          />
        )}

        {/* Speed */}
        {supported.includes('speed') && (
          <SliderField
            label="Speed"
            id="speed"
            value={s.speed ?? 1.0}
            min={0.7}
            max={1.2}
            step={0.01}
            onChange={(v) => update('speed', v)}
            disabled={disabled}
            hint="Playback speed of the generated speech (0.7 – 1.2)."
          />
        )}

        {/* Speaker Boost */}
        {supported.includes('use_speaker_boost') && (
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="use_speaker_boost" className="text-sm font-medium text-foreground">
                Speaker Boost
              </label>
              <p className="text-xs text-muted-foreground">Enhances voice clarity and presence.</p>
            </div>
            <input
              id="use_speaker_boost"
              type="checkbox"
              checked={!!s.use_speaker_boost}
              onChange={(e) => update('use_speaker_boost', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 accent-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSettingsPanel;
