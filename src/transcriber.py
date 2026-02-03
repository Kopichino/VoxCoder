import whisper
import warnings

# Suppress annoying warnings for cleaner output
warnings.filterwarnings("ignore")

def transcribe_audio(audio_path, model_size="base"):
    """
    Takes an audio path and returns the transcribed text string.
    """
    print(f"🧠 Loading Whisper model ('{model_size}')... (this might take a moment first time)")
    
    # Load the model (downloads automatically on first run)
    model = whisper.load_model(model_size)
    
    print("📝 Transcribing...")
    result = model.transcribe(audio_path)
    
    text = result["text"].strip()
    print(f"✅ Transcription complete: \"{text}\"")
    return text