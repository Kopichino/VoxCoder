from src.audio_recorder import record_audio
from src.transcriber import transcribe_audio
import os

def main():
    # Ensure recordings directory exists
    if not os.path.exists("recordings"):
        os.makedirs("recordings")

    # Step 1: Record Voice
    print("--- Phase 1: Voice to Text ---")
    input("Press Enter to start recording (5 seconds)...")
    
    audio_file = record_audio(duration=5)
    
    # Step 2: Transcribe
    text = transcribe_audio(audio_file)
    
    print("\n--- RESULT ---")
    print(f"You said: {text}")
    print("--------------")

if __name__ == "__main__":
    main()