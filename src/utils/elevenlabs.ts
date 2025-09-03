// ElevenLabs utility functions and model selection

import { ElevenLabsModel, OutputFormat, TTSSettings } from "@/types";

// Model selection based on use case
export function selectOptimalModel(
  useCase: "quality" | "speed" | "balanced" = "quality"
): ElevenLabsModel {
  switch (useCase) {
    case "speed":
      return "eleven_flash_v2_5"; // Ultra-fast, ~75ms latency
    case "balanced":
      return "eleven_turbo_v2_5"; // Good balance of quality and speed
    case "quality":
    default:
      return "eleven_multilingual_v2"; // Best quality for motivational content
  }
}

// Baseline TTS settings with dynamic configuration based on model
export function getBaselineTTSSettings(modelId: ElevenLabsModel): TTSSettings {
  // Model-specific settings based on API requirements
  if (modelId === "eleven_v3") {
    // v3 model requires specific stability values: 0.0, 0.5, or 1.0
    return {
      stability: 0.0, // Creative mode for expressive motivational content
      similarity_boost: 0.85, // Higher for voice authenticity
      style: 0.0, // Available for v3
      use_speaker_boost: true, // Enhanced clarity
    };
  }

  const baseSettings: TTSSettings = {
    stability: 0.3, // Less consistent but more dynamic range
    similarity_boost: 0.85, // Higher for voice authenticity
  };

  // Additional settings only for eleven_multilingual_v2
  if (modelId === "eleven_multilingual_v2") {
    return {
      ...baseSettings,
      style: 0.0, // Do not use
      use_speaker_boost: true, // Enhanced clarity
    };
  }

  return baseSettings;
}

// Optimized settings for motivational speech (use getPresetSettings for model-specific config)
export const MOTIVATIONAL_TTS_SETTINGS: TTSSettings = {
  stability: 0.3, // Less consistent but more dynamic range
  similarity_boost: 0.85, // Higher for voice authenticity
};

// Get TTS settings with model-specific adjustments (replaces redundant presets)
export function getTTSSettings(modelId: ElevenLabsModel): TTSSettings {
  return getBaselineTTSSettings(modelId);
}

// Output format selection based on use case
export function selectOutputFormat(
  useCase: "streaming" | "download" | "processing" = "download"
): OutputFormat {
  switch (useCase) {
    case "streaming":
      return "mp3_22050_32"; // Lower quality for faster streaming
    case "processing":
      return "pcm_44100"; // Raw audio for further processing
    case "download":
    default:
      return "mp3_44100_128"; // High quality for final output
  }
}

// Validate model compatibility with features
export function validateModelFeatures(
  modelId: ElevenLabsModel,
  features: string[]
): boolean {
  const modelCapabilities = {
    eleven_v3: ["multilingual", "expressive", "dialogue"],
    eleven_multilingual_v2: ["multilingual", "stable", "emotional"],
    eleven_flash_v2_5: ["multilingual", "fast", "realtime"],
    eleven_turbo_v2_5: ["multilingual", "balanced", "fast"],
  };

  const capabilities = modelCapabilities[modelId] || [];
  return features.every((feature) => capabilities.includes(feature));
}

// Character limits by model
export const MODEL_LIMITS = {
  eleven_v3: 10000,
  eleven_multilingual_v2: 10000,
  eleven_flash_v2_5: 40000,
  eleven_turbo_v2_5: 40000,
} as const;

// Get character limit for model
export function getModelCharacterLimit(modelId: ElevenLabsModel): number {
  return MODEL_LIMITS[modelId] || 5000;
}

// Chunk text based on model limits
export function chunkTextForModel(
  text: string,
  modelId: ElevenLabsModel
): string[] {
  const limit = getModelCharacterLimit(modelId);

  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWithPunctuation = trimmedSentence + ".";

    if ((currentChunk + sentenceWithPunctuation).length > limit) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentenceWithPunctuation;
      } else {
        // Single sentence is too long, force split
        chunks.push(sentenceWithPunctuation.substring(0, limit));
        currentChunk = sentenceWithPunctuation.substring(limit);
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentenceWithPunctuation;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
