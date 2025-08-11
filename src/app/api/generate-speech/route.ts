import { NextRequest, NextResponse } from 'next/server';
import { GenerateSpeechRequest, GenerateSpeechResponse, TTSSettings, ElevenLabsModel } from '@/types';
import { 
  MOTIVATIONAL_TTS_SETTINGS, 
  selectOptimalModel, 
  selectOutputFormat,
  getModelCharacterLimit 
} from '@/utils/elevenlabs';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSpeechRequest = await request.json();
    const { apiKey, text, voiceId, settings, modelId, outputFormat } = body;

    // Basic validation
    if (!apiKey || !text || !voiceId) {
      return NextResponse.json<GenerateSpeechResponse>({
        audioData: "",
        success: false,
        error: 'API key, text, and voice ID are required'
      }, { status: 400 });
    }



    // Use optimized settings for motivational content
    const ttsSettings: TTSSettings = {
      ...MOTIVATIONAL_TTS_SETTINGS,
      ...settings,
    };

    // Select optimal model and format
    const selectedModel = modelId || selectOptimalModel('quality');
    const selectedFormat = outputFormat || selectOutputFormat('download');
    
    // Validate text length against model limits
    const characterLimit = getModelCharacterLimit(selectedModel as ElevenLabsModel);
    if (text.length > characterLimit) {
      return NextResponse.json<GenerateSpeechResponse>({
        audioData: "",
        success: false,
        error: `Text exceeds ${selectedModel} character limit of ${characterLimit}`
      }, { status: 400 });
    }

    // Generate speech with modern model
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: selectedModel,
        voice_settings: ttsSettings,
        output_format: selectedFormat,
      }),
    });

    if (!response.ok) {
      let message = 'Failed to generate speech';
      
      if (response.status === 401) {
        message = 'Invalid ElevenLabs API key';
      } else if (response.status === 429) {
        message = 'Rate limit exceeded. Please try again later';
      } else if (response.status === 402) {
        message = 'Insufficient quota. Please check your ElevenLabs account';
      }

      return NextResponse.json<GenerateSpeechResponse>({
        audioData: "",
        success: false,
        error: message
      }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({
      audioData: audioBase64,
      success: true,
    });

  } catch (error) {
    console.error('Error in generate-speech API:', error);
    
    return NextResponse.json<GenerateSpeechResponse>({
      audioData: "",
      success: false,
      error: 'Internal server error during speech generation'
    }, { status: 500 });
  }
}