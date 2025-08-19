// Simplified types for AI Motivation Song Generator

// User Form Data
export interface UserFormData {
  name: string;
  characterPrompt: string;
  selectedVoiceId: string;
  selectedModelId: ElevenLabsModel;
  physicalActivity: string;
  customInstructions?: string;
  songTitle?: string;
  sponsor?: string;
  youtubeUrl: string;
}

// API Keys
export interface APIKeys {
  openaiKey: string;
  elevenlabsKey: string;
  youtubeCookies?: string;
}

// Processing Steps
export enum ProcessingStep {
  DOWNLOADING_AUDIO = "downloading_audio",
  GENERATING_TEXT = "generating_text",
  GENERATING_SPEECH = "generating_speech",
  SPLICING_AUDIO = "splicing_audio",
  FINALIZING = "finalizing",
}

export interface ProcessingProgress {
  currentStep: ProcessingStep;
  progress: number; // 0-100
  message?: string;
}

// ElevenLabs Voice
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

// API Request/Response Types
export interface ExtractAudioRequest {
  youtubeUrl: string;
}

export interface ExtractAudioResponse {
  audioData: string; // Base64 encoded audio data
  duration: number;
  title: string;
  success: boolean;
  error?: string;
}

export interface GenerateTextRequest {
  apiKey: string;
  userData: UserFormData;
}

export interface GenerateTextResponse {
  motivationalText: string;
  chunks: string[];
  success: boolean;
  error?: string;
}

export interface GetVoicesRequest {
  apiKey: string;
}

export interface GetVoicesResponse {
  voices: ElevenLabsVoice[];
  success: boolean;
  error?: string;
}

export interface GenerateSpeechRequest {
  apiKey: string;
  text: string;
  voiceId: string;
  settings?: TTSSettings;
  modelId?: string;
  outputFormat?: string;
}

export interface GenerateSpeechResponse {
  audioData: string; // Base64 encoded audio data
  success: boolean;
  error?: string;
}

export interface SpliceAudioRequest {
  originalAudio: string; // Base64 encoded audio data
  speechAudio: string | string[]; // Base64 encoded audio data
  spliceMode: SpliceMode;
  crossfadeDuration?: number;
  musicDuration?: number;
}

export interface SpliceAudioResponse {
  finalAudio: ArrayBuffer | string;
  blobUrl?: string; // For large files processed via blob storage
  success: boolean;
  error?: string;
}

// Supporting Types
export type SpliceMode = "intro" | "random" | "distributed";

// OpenAI Model Options
export type OpenAIModel = 
  | 'gpt-4o'           // Latest GPT-4o model (recommended)
  | 'gpt-4o-mini'      // Faster, cheaper GPT-4o variant
  | 'gpt-4-turbo'      // Previous generation turbo
  | 'gpt-4'            // Standard GPT-4
  | 'gpt-3.5-turbo';   // Most cost-effective option

export interface TTSSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// ElevenLabs Model Options
export type ElevenLabsModel = 
  | 'eleven_multilingual_v2'    // Best quality, 29 languages
  | 'eleven_flash_v2_5'         // Ultra-fast, 32 languages, ~75ms latency
  | 'eleven_turbo_v2_5'         // Balanced quality/speed, 32 languages
  | 'eleven_v3';                // Most expressive (alpha), 70+ languages

export type OutputFormat = 
  | 'mp3_44100_128'    // High quality MP3
  | 'mp3_22050_32'     // Lower quality, smaller file
  | 'pcm_16000'        // Raw PCM for processing
  | 'pcm_22050'        // Higher quality PCM
  | 'pcm_44100';       // Highest quality PCM

export interface SpeakerProfile {
  name: string;
  systemPrompt: string;
  suggestedVoices: string[];
  characteristics: string[];
}

// Component Props
export interface UserInputFormProps {
  onSubmit: (data: UserFormData) => void;
  isLoading: boolean;
  initialData?: Partial<UserFormData>;
  elevenlabsApiKey?: string;
}

export interface APIKeyManagerProps {
  onKeysValidated: (keys: APIKeys) => void;
  isLoading?: boolean;
}

export interface VoiceSelectorProps {
  apiKey: string;
  onVoiceSelected: (voiceId: string) => void;
  selectedVoiceId?: string;
}

export interface AudioProcessorProps {
  formData: UserFormData;
  apiKeys: APIKeys;
  selectedVoiceId: string;
  onProcessingComplete: (audioBlob: Blob) => void;
  onProgressUpdate: (progress: ProcessingProgress) => void;
  onError: (error: string) => void;
}

export interface AudioPlayerProps {
  audioBlob: Blob;
  filename: string;
  onDownload: () => void;
  onReset?: () => void;
}