import { NextRequest, NextResponse } from "next/server";
import { SpliceAudioRequest, SpliceAudioResponse } from "@/types";
import { convertBase64ToBuffer, validateTotalPayloadSize } from "@/utils/validation";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promises as fs, existsSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

// Set ffmpeg path using ffmpeg-static
if (ffmpegStatic) {
  // Handle the \ROOT\ placeholder issue in ffmpeg-static paths
  let ffmpegPath = ffmpegStatic;
  if (ffmpegPath.startsWith("\\ROOT\\")) {
    // Replace \ROOT\ with the actual project root
    ffmpegPath = join(process.cwd(), ffmpegPath.replace("\\ROOT\\", ""));
  }

  const resolvedPath = resolve(ffmpegPath);

  // Check if file exists and set the path
  try {
    if (existsSync(resolvedPath)) {
      ffmpeg.setFfmpegPath(resolvedPath);
    } else {
      console.warn("FFmpeg binary not found, falling back to system ffmpeg");
      ffmpeg.setFfmpegPath("ffmpeg");
    }
  } catch {
    console.error("Error setting ffmpeg path");
    ffmpeg.setFfmpegPath("ffmpeg");
  }
} else {
  console.warn("ffmpeg-static not available, falling back to system ffmpeg");
  ffmpeg.setFfmpegPath("ffmpeg");
}



// Helper function to get audio duration
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(duration);
      }
    });
  });
}

// Create distributed audio with speech chunks inserted at even intervals
async function createDistributedAudio(
  originalPath: string,
  speechPaths: string[],
  outputPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tempDir: string
): Promise<void> {
  if (speechPaths.length === 0) {
    throw new Error("No speech chunks provided");
  }

  // Get the duration of the original song
  const songDuration = await getAudioDuration(originalPath);

  // Get durations of all speech chunks
  const speechDurations = await Promise.all(
    speechPaths.map((path) => getAudioDuration(path))
  );

  // Calculate evenly distributed insertion points in the ORIGINAL song
  const numChunks = speechPaths.length;
  const interval = songDuration / (numChunks + 1);
  const insertionPoints = Array.from(
    { length: numChunks },
    (_, i) => (i + 1) * interval
  );

  // Build the complex filter for inserting speech chunks
  const filterParts: string[] = [];
  const crossfadeDuration = 0.3; // 300ms crossfade
  const segments: string[] = [];

  // Start with music from beginning to first insertion point
  let currentMusicTime = 0;
  
  for (let i = 0; i < numChunks; i++) {
    const insertionPoint = insertionPoints[i]!;
    const speechDuration = speechDurations[i]!;

    // Music segment from current position to insertion point
    const musicSegmentDuration = insertionPoint - currentMusicTime;
    if (musicSegmentDuration > 0) {
      filterParts.push(
        `[0:a]atrim=start=${currentMusicTime}:duration=${musicSegmentDuration},volume=0.8[music_seg${i}]`
      );
      segments.push(`[music_seg${i}]`);
    }

    // Add speech chunk with volume boost (+3dB) and fade effects
    filterParts.push(
      `[${i + 1}:a]volume=2.0,afade=t=in:ss=0:d=${crossfadeDuration},afade=t=out:st=${speechDuration - crossfadeDuration}:d=${crossfadeDuration}[speech${i}]`
    );
    segments.push(`[speech${i}]`);

    // Update current music time to continue from insertion point
    currentMusicTime = insertionPoint;
  }

  // Add final music segment from last insertion point to end of song
  const finalMusicDuration = songDuration - currentMusicTime;
  if (finalMusicDuration > 0) {
    filterParts.push(
      `[0:a]atrim=start=${currentMusicTime}:duration=${finalMusicDuration},volume=0.8[final_music]`
    );
    segments.push(`[final_music]`);
  }

  // Concatenate all segments to create the final extended audio
  if (segments.length > 1) {
    filterParts.push(
      `${segments.join("")}concat=n=${segments.length}:v=0:a=1,volume=0.95[final]`
    );
  } else {
    filterParts.push(`${segments[0]}volume=0.95[final]`);
  }

  // Calculate expected final duration for logging
  const totalSpeechDuration = speechDurations.reduce((sum, duration) => sum + duration, 0);
  const expectedFinalDuration = songDuration + totalSpeechDuration;
  
  console.log(`Original song duration: ${songDuration}s`);
  console.log(`Total speech duration: ${totalSpeechDuration}s`);
  console.log(`Expected final duration: ${expectedFinalDuration}s`);
  console.log(`Insertion points: [${insertionPoints.map(p => p.toFixed(2)).join(', ')}]s`);

  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg();

    // Add original music as input
    command.input(originalPath);

    // Add all speech chunks as inputs
    speechPaths.forEach((path) => command.input(path));

    command
      .complexFilter(filterParts)
      .outputOptions(["-map", "[final]"])
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .audioFrequency(44100)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        console.error("FFmpeg error in distributed audio:", err);
        console.error("Filter parts:", filterParts);
        reject(err);
      })
      .run();
  });
}

export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];
  
  // Set up abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout

  try {
    const body: SpliceAudioRequest = await request.json();
    const { originalAudio, speechAudio, spliceMode = "intro" } = body;

    // Basic validation
    if (!originalAudio || !speechAudio) {
      clearTimeout(timeoutId);
      return NextResponse.json<SpliceAudioResponse>(
        {
          finalAudio: "",
          success: false,
          error: "Both original audio and speech audio are required",
        },
        { status: 400 }
      );
    }

    // Convert and validate file sizes using utility functions
    const originalResult = convertBase64ToBuffer(originalAudio, "original audio");
    if (originalResult.error) {
      clearTimeout(timeoutId);
      return NextResponse.json<SpliceAudioResponse>(
        {
          finalAudio: "",
          success: false,
          error: originalResult.error,
        },
        { status: originalResult.statusCode || 400 }
      );
    }
    const originalBuffer = originalResult.buffer!;

    const speechAudioArray = Array.isArray(speechAudio) ? speechAudio : [speechAudio];
    const speechBuffers: Buffer[] = [];
    const fileSizes: number[] = [originalBuffer.length];
    
    for (let i = 0; i < speechAudioArray.length; i++) {
      const audioItem = speechAudioArray[i];
      if (audioItem && typeof audioItem === "string") {
        const speechResult = convertBase64ToBuffer(audioItem, `speech audio ${i + 1}`);
        if (speechResult.error) {
          clearTimeout(timeoutId);
          return NextResponse.json<SpliceAudioResponse>(
            {
              finalAudio: "",
              success: false,
              error: speechResult.error,
            },
            { status: speechResult.statusCode || 400 }
          );
        }
        speechBuffers.push(speechResult.buffer!);
        fileSizes.push(speechResult.buffer!.length);
      }
    }
    
    // Validate total payload size
    const sizeValidation = validateTotalPayloadSize(fileSizes);
    if (!sizeValidation.isValid) {
      clearTimeout(timeoutId);
      return NextResponse.json<SpliceAudioResponse>(
        {
          finalAudio: "",
          success: false,
          error: sizeValidation.error!,
        },
        { status: sizeValidation.statusCode || 413 }
      );
    }

    const sessionId = randomUUID();
    const tempDir = join(tmpdir(), `audio-splice-${sessionId}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Save original audio
    const originalPath = join(tempDir, "original.mp3");
    await fs.writeFile(originalPath, originalBuffer);
    tempFiles.push(originalPath);

    // Handle speech audio (single or multiple chunks)
    const speechPaths: string[] = [];

    for (let i = 0; i < speechBuffers.length; i++) {
      const speechBuffer = speechBuffers[i];
      if (!speechBuffer) continue;

      const speechPath = join(tempDir, `speech_${i}.mp3`);
      await fs.writeFile(speechPath, speechBuffer);
      tempFiles.push(speechPath);
      speechPaths.push(speechPath);
    }

    // For distributed mode, we'll use individual speech chunks
    // For other modes, combine speech chunks if multiple
    let combinedSpeechPath = speechPaths[0];
    if (
      speechPaths.length > 1 &&
      combinedSpeechPath &&
      spliceMode !== "distributed"
    ) {
      const newCombinedPath = join(tempDir, "combined_speech.mp3");
      tempFiles.push(newCombinedPath);

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg();

        speechPaths.forEach((path) => command.input(path));

        command
          .complexFilter([
            // Add silence between speech chunks
            ...speechPaths.map(
              (_, i) => `[${i}:a]apad=pad_dur=0.5[padded${i}]`
            ),
            `${speechPaths.map((_, i) => `[padded${i}]`).join("")}concat=n=${
              speechPaths.length
            }:v=0:a=1[combined]`,
          ])
          .outputOptions(["-map", "[combined]"])
          .audioCodec("libmp3lame")
          .audioBitrate("192k")
          .output(newCombinedPath)
          .on("end", () => resolve())
          .on("error", (err) => {
            console.error("FFmpeg error in combine:", err);
            reject(err);
          })
          .run();
      });
      combinedSpeechPath = newCombinedPath;
    }

    // Create final mixed audio
    const outputPath = join(tempDir, "final.mp3");
    tempFiles.push(outputPath);

    await new Promise<void>((resolve, reject) => {
      // For distributed mode, we don't need combinedSpeechPath
      if (spliceMode !== "distributed" && !combinedSpeechPath) {
        reject(new Error("No speech audio available"));
        return;
      }

      // For distributed mode, command setup is handled in createDistributedAudio
      if (spliceMode === "distributed") {
        createDistributedAudio(originalPath, speechPaths, outputPath, tempDir)
          .then(() => resolve())
          .catch(reject);
        return;
      }

      const command = ffmpeg().input(originalPath).input(combinedSpeechPath!);

      let filterComplex: string[];

      switch (spliceMode) {
        case "intro":
          // Speech at beginning with crossfade (+3dB volume boost)
          filterComplex = [
            "[1:a]volume=1.7[speech]",
            "[0:a]volume=0.7[music]",
            `[speech][music]concat=n=2:v=0:a=1,volume=0.9[final]`,
          ];
          break;

        case "random":
        default:
          // Mix speech over music with volume balancing (+3dB speech boost)
          filterComplex = [
            "[0:a]volume=0.6[music]",
            "[1:a]volume=1.7[speech]",
            "[music][speech]amix=inputs=2:duration=first:weights=0.6 1.0[final]",
          ];
      }

      command
        .complexFilter(filterComplex)
        .outputOptions(["-map", "[final]"])
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .audioFrequency(44100)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .run();
    });

    // Read the final audio file
    const finalAudioBuffer = await fs.readFile(outputPath);
    const audioBase64 = finalAudioBuffer.toString("base64");

    // Clear timeout on success
    clearTimeout(timeoutId);

    // Cleanup temp files
    await Promise.all(
      tempFiles.map(async (file) => {
        try {
          await fs.unlink(file);
        } catch (error) {
          console.warn(`Failed to delete temp file ${file}:`, error);
        }
      })
    );

    try {
      await fs.rmdir(tempDir);
    } catch (error) {
      console.warn(`Failed to delete temp directory ${tempDir}:`, error);
    }

    return NextResponse.json<SpliceAudioResponse>({
      finalAudio: audioBase64,
      success: true,
    });
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);
    
    console.error("Error in splice-audio API:", error);

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json<SpliceAudioResponse>(
        {
          finalAudio: "",
          success: false,
          error: "Audio processing timed out. Please try with smaller files or simpler operations.",
        },
        { status: 408 }
      );
    }

    // Cleanup temp files on error
    await Promise.all(
      tempFiles.map(async (file) => {
        try {
          await fs.unlink(file);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup temp file ${file}:`, cleanupError);
        }
      })
    );

    return NextResponse.json<SpliceAudioResponse>(
      {
        finalAudio: "",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to splice audio files",
      },
      { status: 500 }
    );
  }
}
