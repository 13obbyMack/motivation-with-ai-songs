# Volume Gain Implementation (3dB Boost)

## Overview
Implemented 3dB volume gain for TTS audio chunks downloaded from ElevenLabs, matching the Colab implementation.

## Changes Made

### 1. Added Volume Gain Function (`api/splice-audio.py`)
- **Function**: `_apply_volume_gain(input_path, output_path, gain_db)`
- **Purpose**: Applies volume gain in dB to audio files using PyAV
- **Implementation**: 
  - Converts dB to linear gain factor: `gain_factor = 10^(dB/20)`
  - For 3dB: gain factor ≈ 1.412x
  - Processes audio frames using numpy arrays
  - Applies gain multiplication to audio samples
  - Clips values to prevent distortion (-32768 to 32767 for int16)

### 2. Integrated Volume Gain into Audio Processing Pipeline
Volume gain is now applied to ALL speech audio in these scenarios:

#### Distributed Splicing Mode
- Applied to each individual speech chunk before distribution
- Location: `_splice_distributed_pyav()` method
- Each chunk gets +3dB before being inserted into music

#### Intro Splicing Mode
- Applied to speech before concatenating with music
- Handles both single and multiple chunks
- Combined speech gets +3dB boost

#### Fallback Mode (Simple Concatenation)
- Applied when advanced splicing fails
- Ensures speech is audible even in fallback scenarios

### 3. Updated Dependencies
- Added `numpy>=1.24.0` to `requirements.txt`
- Required for audio array manipulation and gain processing

## Technical Details

### Colab Code Equivalent
```python
# Colab (using pydub):
louder_audio = audio + 3

# This project (using PyAV + numpy):
gain_factor = 10 ** (3.0 / 20.0)  # ≈ 1.412
gained_array = audio_array * gain_factor
gained_array = np.clip(gained_array, -32768, 32767)
```

### Processing Flow
1. Speech audio downloaded from ElevenLabs (via blob URL or base64)
2. Converted to standard format (44.1kHz, stereo, MP3)
3. **Volume gain applied (+3dB)** ← NEW STEP
4. Spliced with background music
5. Final audio uploaded to blob storage

## Benefits
- **Consistent Volume**: Speech audio is now 3dB louder, matching Colab behavior
- **Better Audibility**: TTS voice stands out more clearly against background music
- **No Distortion**: Clipping prevents audio artifacts from over-amplification
- **Fallback Safety**: If gain processing fails, original audio is used

## Testing
To verify the implementation:
1. Generate TTS audio with background music
2. Check console logs for: `"Applying 3dB volume gain to speech audio..."`
3. Listen to final audio - speech should be noticeably louder than before
4. Compare with previous versions to confirm volume increase

## Notes
- Gain is applied ONLY to speech audio, not background music
- All splice modes (distributed, intro, random) now include volume gain
- PyAV provides native audio processing without external dependencies
- Numpy is used for efficient array operations on audio samples
