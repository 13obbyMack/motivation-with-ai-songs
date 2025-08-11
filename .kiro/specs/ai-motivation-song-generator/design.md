# Design Document

## Overview

The AI Motivation Song Generator is a modern web application built with Next.js and deployed on Vercel. It combines client-side user interface with server-side audio processing to create personalized motivational songs. The application uses a hybrid architecture where user data and API keys remain client-side for privacy, while computationally intensive audio processing occurs server-side for reliability and performance.

## Architecture

### Frontend Architecture

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context for global state (API keys, user preferences)
- **Audio Handling**: HTML5 Audio API for playback, client-side temporary storage
- **File Management**: Browser File API and temporary blob storage

### Backend Architecture

- **Runtime**: Vercel Edge Functions for API endpoints
- **Audio Processing**: Server-side audio manipulation using lightweight audio libraries
- **External APIs**: OpenAI API for text generation, ElevenLabs API for TTS
- **YouTube Processing**: yt_dlp integration for audio extraction

### Data Flow

1. User inputs → Client-side validation → Form state
2. YouTube URL → Server-side yt_dlp → Temporary audio file
3. User data + API keys → OpenAI API → Generated motivational text
4. Generated text + Voice ID → ElevenLabs API → TTS audio (3dB gain applied)
5. Original audio + TTS audio → Server-side splicing → Final merged audio
6. Final audio → Client download/streaming

## Components and Interfaces

### Core Components

#### 1. UserInputForm Component

```typescript
interface UserInputFormProps {
  onSubmit: (data: UserFormData) => void;
  isLoading: boolean;
}

interface UserFormData {
  name: string;
  characterPrompt: string;
  selectedVoiceId: string;
  physicalActivity: string;
  customInstructions?: string;
  songTitle?: string;
  sponsor?: string;
  youtubeUrl: string;
}
```

#### 2. APIKeyManager Component

```typescript
interface APIKeyManagerProps {
  onKeysValidated: (keys: APIKeys) => void;
}

interface APIKeys {
  openaiKey: string;
  elevenlabsKey: string;
}
```

#### 3. VoiceSelector Component

```typescript
interface VoiceSelectorProps {
  apiKey: string;
  onVoiceSelected: (voiceId: string) => void;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
}
```

#### 4. AudioProcessor Component

```typescript
interface AudioProcessorProps {
  formData: UserFormData;
  apiKeys: APIKeys;
  selectedVoiceId: string;
  onProcessingComplete: (audioBlob: Blob) => void;
  onProgressUpdate: (step: ProcessingStep, progress: number) => void;
}

enum ProcessingStep {
  DOWNLOADING_AUDIO = "downloading_audio",
  GENERATING_TEXT = "generating_text",
  GENERATING_SPEECH = "generating_speech",
  SPLICING_AUDIO = "splicing_audio",
  FINALIZING = "finalizing",
}
```

#### 5. AudioPlayer Component

```typescript
interface AudioPlayerProps {
  audioBlob: Blob;
  filename: string;
  onDownload: () => void;
}
```

### API Endpoints

#### 1. YouTube Audio Extraction

```typescript
// /api/extract-audio
interface ExtractAudioRequest {
  youtubeUrl: string;
}

interface ExtractAudioResponse {
  audioData: ArrayBuffer;
  duration: number;
  title: string;
}
```

#### 2. Text Generation

```typescript
// /api/generate-text
interface GenerateTextRequest {
  apiKey: string;
  userData: UserFormData;
}

interface GenerateTextResponse {
  motivationalText: string;
  chunks: string[];
}
```

#### 3. Voice Retrieval

```typescript
// /api/get-voices
interface GetVoicesRequest {
  apiKey: string;
}

interface GetVoicesResponse {
  voices: ElevenLabsVoice[];
}
```

#### 4. Text-to-Speech Generation

```typescript
// /api/generate-speech
interface GenerateSpeechRequest {
  apiKey: string;
  text: string;
  voiceId: string;
}

interface GenerateSpeechResponse {
  audioData: ArrayBuffer;
}
```

#### 5. Audio Splicing

```typescript
// /api/splice-audio
interface SpliceAudioRequest {
  originalAudio: ArrayBuffer;
  speechAudio: ArrayBuffer;
  spliceMode: "intro" | "random" | "distributed";
}

interface SpliceAudioResponse {
  finalAudio: ArrayBuffer;
}
```

## Data Models

### User Session Data

```typescript
interface UserSession {
  formData: UserFormData;
  apiKeys: APIKeys;
  selectedVoiceId: string;
  processedAudio?: Blob;
  processingHistory: ProcessingStep[];
}
```

### Audio Processing Pipeline

```typescript
interface AudioPipeline {
  originalAudio: AudioBuffer;
  speechAudio: AudioBuffer;
  finalAudio: AudioBuffer;
  metadata: {
    originalDuration: number;
    speechDuration: number;
    finalDuration: number;
    splicePoints: number[];
  };
}
```

### Motivational Speaker Mapping

```typescript
interface SpeakerProfile {
  name: string;
  systemPrompt: string;
  suggestedVoices: string[];
  characteristics: string[];
}

const SPEAKER_PROFILES: Record<string, SpeakerProfile> = {
  David_Goggins: {
    name: "David Goggins",
    systemPrompt: "You are David Goggins, relentless and unbreakable...",
    suggestedVoices: ["masculine-aggressive", "deep-motivational"],
    characteristics: ["intense", "no-nonsense", "raw"],
  },
  // Additional speakers...
};
```

## Error Handling

### Client-Side Error Handling

- Form validation with real-time feedback
- API key validation before processing
- Network error recovery with retry mechanisms
- User-friendly error messages for all failure scenarios

### Server-Side Error Handling

- Graceful API failure handling with fallbacks
- Audio processing error recovery
- Rate limiting and quota management
- Detailed error logging for debugging

### Error Types

```typescript
enum ErrorType {
  INVALID_API_KEY = "invalid_api_key",
  YOUTUBE_EXTRACTION_FAILED = "youtube_extraction_failed",
  TEXT_GENERATION_FAILED = "text_generation_failed",
  TTS_GENERATION_FAILED = "tts_generation_failed",
  AUDIO_PROCESSING_FAILED = "audio_processing_failed",
  NETWORK_ERROR = "network_error",
}

interface AppError {
  type: ErrorType;
  message: string;
  retryable: boolean;
  details?: any;
}
```

## Testing Strategy

### Unit Testing

- Component testing with React Testing Library
- API endpoint testing with Jest
- Audio processing function testing with mock data
- Form validation testing

### Integration Testing

- End-to-end user flow testing with Playwright
- API integration testing with real services (using test keys)
- Audio pipeline testing with sample files
- Error scenario testing

### Performance Testing

- Audio processing performance benchmarks
- Memory usage monitoring during large file processing
- API response time monitoring
- Client-side storage limits testing

## Security Considerations

### API Key Security

- API keys stored only in sessionStorage, never localStorage
- Keys cleared on browser close or explicit logout
- No server-side storage of user API keys
- Client-side encryption of sensitive data in transit

### Data Privacy

- No persistent storage of user audio files
- Temporary files cleaned up after processing
- No logging of personal user information
- GDPR-compliant data handling

### Content Security

- Input sanitization for all user-provided text
- YouTube URL validation to prevent malicious links
- File type validation for uploaded content
- Rate limiting on API endpoints

## Deployment Configuration

### Vercel Configuration

```javascript
// vercel.json
{
  "functions": {
    "app/api/extract-audio/route.ts": {
      "maxDuration": 60
    },
    "app/api/splice-audio/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables

- No sensitive keys stored in environment (user-provided)
- Configuration for audio processing parameters
- Feature flags for different processing modes

### Performance Optimizations

- Edge function deployment for low latency
- Streaming responses for large audio files
- Client-side caching of processed audio
- Lazy loading of heavy components

## Scalability Considerations

### Client-Side Scalability

- Efficient memory management for large audio files
- Progressive loading of audio processing steps
- Optimized bundle size with code splitting

### Server-Side Scalability

- Stateless API design for horizontal scaling
- Efficient audio processing algorithms
- Memory-conscious file handling
- Connection pooling for external APIs

### Future Enhancements

- Support for multiple audio formats
- Batch processing capabilities
- Advanced audio effects and filters
- Social sharing features
- User preference persistence (optional)
