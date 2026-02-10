from src.audio_recorder import record_audio
from src.transcriber import transcribe_audio
from src.llm_engine import generate_code
import os

def main():
    # 1. Setup
    if not os.path.exists("recordings"):
        os.makedirs("recordings")

    print("\n=======================================")
    print("🎙️  VOICE TO CODE PROJECT (PHASE 3)")
    print("=======================================")
    
    # 2. Record
    input("Press Enter to record your instruction (5s)...")
    audio_file = record_audio(duration=5)
    
    # 3. Transcribe (The Ear)
    english_text = transcribe_audio(audio_file)
    print(f"\n🗣️  You said: {english_text}")
    
    if not english_text:
        print("❌ No speech detected.")
        return

    # 4. Check for existing script (The Memory)
    current_code = ""
    if os.path.exists("generated_script.py"):
        with open("generated_script.py", "r") as f:
            current_code = f.read()
        print("\n📂 Found existing 'generated_script.py'. Loaded for context.")
    else:
        print("\n✨ No existing script found. Creating new...")

    # 5. Generate/Edit Code (The Brain)
    # The prompt will naturally include instructions like "change line 4..." 
    # and the LLM will see current_code to know what line 4 is.
    python_code = generate_code(english_text, current_code=current_code)
    
    print("\n🐍 GENERATED/UPDATED PYTHON CODE:")
    print("-------------------------")
    print(python_code)
    print("-------------------------")
    
    # 6. Save
    with open("generated_script.py", "w") as f:
        f.write(python_code)
        print("\n💾 Saved to 'generated_script.py'")

if __name__ == "__main__":
    main()
