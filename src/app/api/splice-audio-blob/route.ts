import { NextRequest, NextResponse } from "next/server";
import { SpliceAudioRequest, SpliceAudioResponse } from "@/types";
import { convertBase64ToBuffer, validateFileSize } from "@/utils/validation";
import { shouldUseBlob, processLargeFile, BLOB_CONFIG } from "@/utils/blob-storage";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promises as fs, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

// Set ffmpeg path using ffmpeg-static
if (ffmpegStatic) {
  let ffmpegPath = ffmpegStatic;
  if (ffmpegPath.startsWith("\\ROOT\\")) {
    ffmpegPath = join(process.cwd(), ffmpegPath.replace("\\ROOT\\", ""));
  }

  const resolvedPath = join(ffmpegPath);

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

// Audio processing function that can handle both regular and blob workflows
async function processAudioSplicing(
  originalBuffer: Buffer,
  speechBuffers: Buffer[],
  spliceMode: string
): Promise<Buffer> {
  const sessionId = randomUUID();
  const tempDir = join(tmpdir(), `audio-splice-${sessionId}`);
  const tempFiles: string[] = [];

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Save original audio
    const originalPath = join(tempDir, "original.mp3");
    await fs.writeFile(originalPath, originalBuffer);
    tempFiles.push(originalPath);

    // Save speech audio files
    const speechPaths: string[] = [];
    for (let i = 0; i < speechBuffers.length; i++) {
      const speechPath = join(tempDir, `speech_${i}.mp3`);
      await fs.writeFile(speechPath, speechBuffers[i]!);
      tempFiles.push(speechPath);
      speechPaths.push(speechPath);
    }

    // Create final mixed audio
    const outputPath = join(tempDir, "final.mp3");
    tempFiles.push(outputPath);

    await new Promise<void>((resolve, reject) => {
      if (spliceMode === "distributed") {
        // Use distributed audio processing (implementation from original route)
        // This is a simplified version - you'd implement the full distributed logic here
        ffmpeg()
          .input(originalPath)
          .input(speechPaths[0]!)
          .complexFilter([
            "[0:a]volume=0.7[music]",
            "[1:a]volume=1.7[speech]",
            "[music][speech]amix=inputs=2:duration=first:weights=0.6 1.0[final]",
          ])
          .outputOptions(["-map", "[final]"])
          .audioCodec("libmp3lame")
          .audioBitrate("192k")
          .audioFrequency(44100)
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      } else {
        // Regular splicing logic
        const command = ffmpeg().input(originalPath);
        
        speechPaths.forEach(path => command.input(path));

        let filterComplex: string[];
        switch (spliceMode) {
          case "intro":
            filterComplex = [
              "[1:a]volume=1.7[speech]",
              "[0:a]volume=0.7[music]",
              "[speech][music]concat=n=2:v=0:a=1,volume=0.9[final]",
            ];
            break;
          default:
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
          .on("error", (err) => reject(err))
          .run();
      }
    });

    // Read the final audio file
    const finalAudioBuffer = await fs.readFile(outputPath);

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

    return finalAudioBuffer;
  } catch (error) {
    // Cleanup on error
    await Promise.all(
      tempFiles.map(async (file) => {
        try {
          await fs.unlink(file);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup temp file ${file}:`, cleanupError);
        }
      })
    );
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const body: SpliceAudioRequest = await request.json();
    const { originalAudio, speechAudio, spliceMode = "intro" } = body;

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

    // Convert and validate files
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
      }
    }

    // Calculate total size
    const totalSize = originalBuffer.length + speechBuffers.reduce((sum, buf) => sum + buf.length, 0);
    
    // Check if we should use blob storage
    const useBlob = shouldUseBlob(totalSize);
    
    if (useBlob) {
      console.log(`Using blob storage for large file processing (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
      
      // Validate against blob storage limits
      if (totalSize > BLOB_CONFIG.MAX_BLOB_SIZE) {
        clearTimeout(timeoutId);
        return NextResponse.json<SpliceAudioResponse>(
          {
            finalAudio: "",
            success: false,
            error: `Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum blob storage limit of 100MB.`,
          },
          { status: 413 }
        );
      }

      // Process using blob storage
      const blobResult = await processLargeFile(
        originalBuffer,
        `splice-${Date.now()}.mp3`,
        async (buffer) => {
          return await processAudioSplicing(buffer, speechBuffers, spliceMode);
        }
      );

      if (blobResult.error) {
        clearTimeout(timeoutId);
        return NextResponse.json<SpliceAudioResponse>(
          {
            finalAudio: "",
            success: false,
            error: blobResult.error,
          },
          { status: 500 }
        );
      }

      clearTimeout(timeoutId);

      if (blobResult.blobUrl) {
        // Return blob URL for large files
        return NextResponse.json<SpliceAudioResponse>({
          finalAudio: "", // Empty for blob response
          blobUrl: blobResult.blobUrl,
          success: true,
        });
      } else if (blobResult.result) {
        // Return base64 for smaller processed files
        return NextResponse.json<SpliceAudioResponse>({
          finalAudio: blobResult.result.toString("base64"),
          success: true,
        });
      }
    } else {
      // Regular processing for smaller files
      const validation = validateFileSize(totalSize);
      if (!validation.isValid) {
        clearTimeout(timeoutId);
        return NextResponse.json<SpliceAudioResponse>(
          {
            finalAudio: "",
            success: false,
            error: validation.error!,
          },
          { status: validation.statusCode || 413 }
        );
      }

      const finalAudioBuffer = await processAudioSplicing(originalBuffer, speechBuffers, spliceMode);
      
      clearTimeout(timeoutId);
      
      return NextResponse.json<SpliceAudioResponse>({
        finalAudio: finalAudioBuffer.toString("base64"),
        success: true,
      });
    }

    // Fallback error
    clearTimeout(timeoutId);
    return NextResponse.json<SpliceAudioResponse>(
      {
        finalAudio: "",
        success: false,
        error: "Unexpected processing error",
      },
      { status: 500 }
    );

  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error in splice-audio-blob API:", error);

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

    return NextResponse.json<SpliceAudioResponse>(
      {
        finalAudio: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to splice audio files",
      },
      { status: 500 }
    );
  }
}