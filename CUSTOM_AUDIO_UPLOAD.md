# Custom Audio Upload Feature

## Overview

The AI Motivation Song Generator now supports uploading custom MP3 files as an alternative to YouTube downloads. This feature allows users to use their own audio files as background music for their motivational songs.

## Features

### Audio Source Options

Users can now choose between two audio sources:

1. **YouTube URL** (default) - Download audio from YouTube videos
2. **Upload MP3 File** - Upload a custom MP3 file from their device

### File Requirements

- **Format**: MP3 (audio/mpeg)
- **Maximum Size**: 50MB
- **Validation**: Automatic MP3 header validation

## Implementation Details

### New API Endpoint

**File**: `api/upload-audio.py`

This serverless function handles custom MP3 file uploads with the following features:

- Base64 audio data decoding
- MP3 format validation (checks for ID3 tags and MP3 frame sync)
- File size validation (max 50MB)
- Vercel Blob storage integration
- Session-based folder organization

**Endpoint**: `/api/upload-audio`

**Request Format**:
```json
{
  "audioData": "base64_encoded_mp3_data",
  "filename": "my-audio.mp3",
  "sessionId": "unique_session_id"
}
```

**Response Format**:
```json
{
  "audioUrl": "https://blob.vercel-storage.com/...",
  "duration": 0,
  "title": "my-audio.mp3",
  "success": true,
  "deliveryMethod": "blob",
  "audioSize": "5.23MB",
  "sessionId": "unique_session_id"
}
```

### Frontend Changes

#### Updated Types (`src/types/index.ts`)

- Added `audioSource` field to `UserFormData` ('youtube' | 'upload')
- Added `uploadedAudioFile` field to `UserFormData` (File type)
- Added `UploadAudioRequest` and `UploadAudioResponse` interfaces

#### Updated Components

**UserInputForm** (`src/components/UserInputForm.tsx`):
- Radio button selection for audio source
- Conditional rendering of YouTube URL input or file upload button
- File validation (type and size)
- Visual feedback for uploaded file name

**AudioProcessor** (`src/components/AudioProcessor.tsx`):
- Conditional audio processing based on `audioSource`
- Dynamic step descriptions based on audio source
- Integrated `uploadAudio` API call for custom files

#### New API Function (`src/utils/api.ts`)

```typescript
export async function uploadAudio(
  audioFile: File, 
  sessionId?: string
): Promise<UploadAudioResponse>
```

Handles:
- File to base64 conversion
- API request to upload endpoint
- Blob URL fetching and conversion back to base64
- Error handling

#### Updated Validation (`src/utils/validation.ts`)

Enhanced `validateUserFormData` to:
- Check audio source type
- Validate YouTube URL when source is 'youtube'
- Validate uploaded file when source is 'upload'
- Check file type (MP3 only)
- Check file size (max 50MB)

## User Flow

### Using Custom Audio Upload

1. **Select Audio Source**
   - User selects "Upload MP3 File" radio button
   - YouTube URL field is hidden
   - File upload button appears

2. **Upload File**
   - User clicks "Choose MP3 File" button
   - Browser file picker opens (filtered to .mp3 files)
   - User selects an MP3 file from their device

3. **Validation**
   - File type is validated (must be audio/mpeg or .mp3)
   - File size is checked (must be ≤ 50MB)
   - Errors are displayed if validation fails

4. **Processing**
   - File is converted to base64
   - Uploaded to Vercel Blob storage via API
   - Stored in session-specific folder: `custom-audio/{sessionId}/`
   - Used in audio splicing just like YouTube audio

5. **Cleanup**
   - After download, session cleanup removes uploaded files
   - Same cleanup logic as YouTube downloads

## Storage Architecture

### Blob Storage Structure

```
vercel-blob-storage/
├── youtube-audio/
│   └── {sessionId}/
│       └── {title}-{timestamp}-{hash}.mp3
├── custom-audio/          # NEW
│   └── {sessionId}/       # NEW
│       └── {filename}-{timestamp}-{hash}.mp3  # NEW
├── speech-chunks/
│   └── {sessionId}/
│       └── chunk-{index}-{timestamp}-{hash}.mp3
└── final-audio/
    └── {sessionId}/
        └── final-{timestamp}-{hash}.mp3
```

### Session Management

- Each upload session gets a unique ID
- All audio files (YouTube, custom, speech, final) are organized by session
- Session cleanup removes all files after download
- Prevents storage bloat and manages costs

## Benefits

### For Users

1. **Flexibility**: Use any MP3 file, not just YouTube videos
2. **Privacy**: Upload personal audio files without sharing YouTube links
3. **Offline Content**: Use audio files that aren't available on YouTube
4. **Quality Control**: Use high-quality audio files directly
5. **Copyright Compliance**: Use properly licensed audio files

### For Developers

1. **Consistent Architecture**: Same blob storage pattern as YouTube downloads
2. **Session Management**: Unified cleanup across all audio sources
3. **Validation**: Robust file type and size checking
4. **Error Handling**: Clear error messages for users
5. **Scalability**: Blob storage handles files of any size

## Technical Considerations

### File Size Limits

- **Frontend Validation**: 50MB (prevents large uploads)
- **Backend Validation**: 50MB (enforced in Python API)
- **Blob Storage**: No practical limit (Vercel Blob handles large files)

### MP3 Validation

The API validates MP3 files by checking for:
1. **ID3v2 Tags**: Starts with `ID3` bytes
2. **MP3 Frame Sync**: Starts with `0xFF 0xFB/FA/F3/F2` bytes

This prevents users from uploading non-MP3 files disguised with .mp3 extension.

### Security

- File type validation on both frontend and backend
- Size limits prevent abuse
- Session-based storage prevents unauthorized access
- Automatic cleanup prevents storage bloat

## Future Enhancements

Potential improvements for future versions:

1. **Audio Duration Detection**: Calculate duration on upload
2. **Format Conversion**: Support WAV, M4A, OGG formats
3. **Audio Preview**: Play uploaded file before processing
4. **Drag & Drop**: Drag and drop file upload interface
5. **Multiple Files**: Upload multiple audio files for mixing
6. **Audio Trimming**: Trim uploaded audio before processing
7. **Volume Normalization**: Normalize audio levels automatically

## Testing

### Manual Testing Checklist

- [ ] Upload valid MP3 file (< 50MB)
- [ ] Upload file > 50MB (should fail with error)
- [ ] Upload non-MP3 file (should fail with error)
- [ ] Switch between YouTube and Upload modes
- [ ] Process song with uploaded audio
- [ ] Verify audio quality in final output
- [ ] Verify session cleanup after download
- [ ] Test with various MP3 bitrates (128kbps, 192kbps, 320kbps)

### Error Scenarios

- [ ] No file selected (validation error)
- [ ] Invalid file type (validation error)
- [ ] File too large (validation error)
- [ ] Network error during upload (API error)
- [ ] Blob storage failure (API error)

## Conclusion

The custom audio upload feature provides users with greater flexibility while maintaining the same robust architecture and user experience as the YouTube download feature. All audio processing, storage, and cleanup logic remains consistent across both audio sources.
