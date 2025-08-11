import { NextRequest, NextResponse } from 'next/server';
import { GetVoicesRequest, GetVoicesResponse, ElevenLabsVoice } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: GetVoicesRequest = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json<GetVoicesResponse>({
        voices: [],
        success: false,
        error: 'ElevenLabs API key is required'
      }, { status: 400 });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      let message = 'Failed to retrieve voices from ElevenLabs';
      
      if (response.status === 401) {
        message = 'Invalid ElevenLabs API key';
      } else if (response.status === 429) {
        message = 'Rate limit exceeded. Please try again later';
      } else if (response.status === 402) {
        message = 'Insufficient quota. Please check your ElevenLabs account';
      }

      return NextResponse.json<GetVoicesResponse>({
        voices: [],
        success: false,
        error: message
      }, { status: response.status });
    }

    const data = await response.json();
    
    const voices: ElevenLabsVoice[] = data.voices?.map((voice: unknown) => {
      const voiceData = voice as Record<string, unknown>;
      return {
        voice_id: voiceData.voice_id as string,
        name: voiceData.name as string,
        category: (voiceData.category as string) || 'uncategorized',
        description: voiceData.description as string,
        preview_url: voiceData.preview_url as string,
      };
    }) || [];

    return NextResponse.json<GetVoicesResponse>({
      voices,
      success: true,
    });

  } catch (error) {
    console.error('Error in get-voices API:', error);
    
    return NextResponse.json<GetVoicesResponse>({
      voices: [],
      success: false,
      error: 'Internal server error while retrieving voices'
    }, { status: 500 });
  }
}