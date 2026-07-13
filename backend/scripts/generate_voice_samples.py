#!/usr/bin/env python3
import asyncio
import base64
import json
import os
import sys
import wave

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
import websockets

from app.services.gemini_live import (
    build_gemini_live_ws_url,
    gemini_ssl_context,
    resolve_gemini_live_model,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

VOICES = ["Aoede", "Charon", "Kore", "Fenrir", "Puck", "Leda", "Achird", "Zephyr"]

LANGUAGES = {
    "english_us": "Say exactly: 'Hello, my name is VoqlyAI.' and nothing else.",
    "hindi": "Say exactly: 'नमस्ते, मेरा नाम वोकली एआई है।' and nothing else.",
    "bengali": "Say exactly: 'নমস্কার, আমার নাম ভোকলি এআই।' and nothing else.",
    "gujarati": "Say exactly: 'નમસ્તે, મારું નામ વોકલી એઆઈ છે.' and nothing else.",
    "kannada": "Say exactly: 'ನಮಸ್ಕಾರ, ನನ್ನ ಹೆಸರು ವೋಕ್ಲಿ ಎಐ.' and nothing else.",
    "malayalam": "Say exactly: 'നമസ്കാരം, എന്റെ പേര് വോക്ലി എഐ എന്നാണ്.' and nothing else.",
    "marathi": "Say exactly: 'नमस्कार, माझे नाव वोकली एआय आहे।' and nothing else.",
    "punjabi": "Say exactly: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੇਰਾ ਨਾਮ ਵੋਕਲੀ ਏਆਈ ਹੈ।' and nothing else.",
    "tamil": "Say exactly: 'வணக்கம், என் பெயர் வோக்லி ஏஐ.' and nothing else.",
    "telugu": "Say exactly: 'నమస్కారం, నా పేరు వోక్లీ ఏఐ.' and nothing else."
}

async def generate_voice_sample(api_key: str, model: str, voice_name: str, prompt_text: str, output_path: str):
    url = build_gemini_live_ws_url(api_key)
    
    setup = {
        "setup": {
            "model": model,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": voice_name
                        }
                    }
                }
            }
        }
    }
    
    client_content = {
        "clientContent": {
            "turns": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": prompt_text
                        }
                    ]
                }
            ],
            "turnComplete": True
        }
    }
    
    print(f"Generating audio for voice '{voice_name}' in language prompt '{prompt_text[:20]}...'")
    pcm_buffer = bytearray()
    
    try:
        async with websockets.connect(url, ssl=gemini_ssl_context(), open_timeout=15) as ws:
            # 1. Send Setup frame
            await ws.send(json.dumps(setup))
            
            # 2. Wait for Setup complete (or first server content frame)
            setup_response = await ws.recv()
            
            # 3. Send Text turn
            await ws.send(json.dumps(client_content))
            
            # 4. Stream response and gather audio pcm data
            while True:
                response = await ws.recv()
                msg_data = json.loads(response)
                
                server_content = msg_data.get("serverContent")
                if server_content:
                    model_turn = server_content.get("modelTurn")
                    if model_turn:
                        for part in model_turn.get("parts", []):
                            inline_data = part.get("inlineData")
                            if inline_data and "audio/pcm" in inline_data.get("mimeType", ""):
                                raw_pcm = base64.b64decode(inline_data["data"])
                                pcm_buffer.extend(raw_pcm)
                                
                    if server_content.get("turnComplete"):
                        break
                        
        if len(pcm_buffer) > 0:
            # Save raw PCM 24kHz 16-bit mono little-endian as WAV
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2) # 16-bit
                wav_file.setframerate(24000) # 24kHz
                wav_file.writeframes(pcm_buffer)
            print(f"Successfully saved WAV to {output_path} ({len(pcm_buffer)} pcm bytes)")
        else:
            print(f"Failed to gather audio data for {voice_name}: PCM buffer empty.")
            
    except Exception as e:
        print(f"Error generating sample for {voice_name}: {e}")

async def main():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in backend/.env")
        sys.exit(1)
        
    model = resolve_gemini_live_model()
    
    # Target directory in Next.js public assets folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_voices_dir = os.path.join(os.path.dirname(base_dir), "frontend", "public", "voices")
    
    print(f"Starting voice generation using model {model}...")
    for voice in VOICES:
        for lang_suffix, prompt in LANGUAGES.items():
            out_file = os.path.join(public_voices_dir, f"{voice.lower()}_{lang_suffix}.wav")
            
            # Check if file already exists to avoid redundant calls to Gemini Live API
            if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
                print(f"Skipping {voice} in {lang_suffix} (already exists)")
                continue
                
            await generate_voice_sample(api_key, model, voice, prompt, out_file)
            # Give API a short rest to avoid rate limit throttling
            await asyncio.sleep(1.0)
        
    print("Voice samples generation complete.")

if __name__ == "__main__":
    asyncio.run(main())
