# Audio Splicing Distribution Fix

## Issue Identified

The first two TTS audio chunks were not evenly distributed throughout the song due to a flaw in the interleaving logic in `api/splice-audio.py`.

### Root Cause

1. **Insertion points were calculated correctly** - evenly spaced throughout the music
2. **But the interleaving logic was flawed** - it treated the first speech chunk as an "intro" placed at time 0, then distributed remaining chunks at calculated insertion points

### Previous Behavior
```
Pattern: speech_1 (intro at 0s) + music_segment_1 + speech_2 (at 5s) + music_segment_2 + speech_3 (at 35s) + ...
```

This resulted in:
- Speech chunk 1: Always at 0 seconds (not at calculated insertion point)
- Speech chunk 2: At first calculated insertion point (e.g., 5 seconds)  
- Speech chunk 3+: At subsequent calculated insertion points (e.g., 35s, 65s, etc.)

**The first two chunks had inconsistent spacing** (0s → 5s = 5s gap, then 5s → 35s = 30s gap).

## Fix Applied

### 1. Improved Insertion Point Calculation
```python
# OLD: interval = available_music_duration / len(speech_chunks)
# NEW: interval = available_music_duration / (len(speech_chunks) - 1)
```

This ensures proper even distribution across the available duration.

### 2. Fixed Interleaving Logic
```python
# NEW Pattern: music_segment_1 + speech_1 + music_segment_2 + speech_2 + ... + final_music_segment
```

Now each speech chunk is placed exactly at its calculated insertion point:
- Speech chunk 1: At first calculated insertion point (e.g., 5s)
- Speech chunk 2: At second calculated insertion point (e.g., 35s)
- Speech chunk 3: At third calculated insertion point (e.g., 65s)
- etc.

### Result
All TTS audio chunks are now **consistently and evenly distributed** throughout the song based on the length of the original audio track.

## Files Modified
- `api/splice-audio.py` - Fixed `_splice_distributed_pyav` method

## Testing Recommendation
Test with multiple speech chunks (3-5 chunks) to verify even distribution across different song lengths.