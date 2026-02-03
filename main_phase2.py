from src.audio_recorder import record_audio
from src.transcriber import transcribe_audio
from src.llm_engine import generate_code
import os

def main():
    # 1. Setup
    if not os.path.exists("recordings"):
        os.makedirs("recordings")

    print("\n=======================================")
    print("🎙️  VOICE TO CODE PROJECT (PHASE 2)")
    print("=======================================")
    
    # 2. Record
    input("Press Enter to record your instruction (5s)...")
    audio_file = record_audio(duration=5)
    
    # 3. Transcribe (The Ear)
    english_text = transcribe_audio(audio_file)
    print(f"\n🗣️  You said: {english_text}")
    
    # 4. Generate Code (The Brain)
    if english_text:
        python_code = generate_code(english_text)
        
        print("\n🐍 GENERATED PYTHON CODE:")
        print("-------------------------")
        print(python_code)
        print("-------------------------")
        
        # Optional: Save to a file to prove it works
        with open("generated_script.py", "w") as f:
            f.write(python_code)
            print("\n💾 Saved to 'generated_script.py'")
    else:
        print("❌ No speech detected.")

if __name__ == "__main__":
    main()