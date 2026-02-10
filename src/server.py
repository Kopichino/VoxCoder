from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

# Import our existing modules
from src.transcriber import transcribe_audio
from src.llm_engine import generate_code

app = FastAPI()

# Allow the frontend (Phase 4) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Voice-to-Code API is running! 🚀"}

@app.post("/process-audio")
async def process_audio_endpoint(
    file: UploadFile = File(...),
    current_code: str = Form("") # <--- Accept current_code as a Form field (default empty)
):
    try:
        # 1. Save file (same as before)
        temp_filename = f"recordings/{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Transcribe
        english_text = transcribe_audio(temp_filename)
        print(f"🗣️ User said: {english_text}")
        print(f"📝 Context code length: {len(current_code)} chars")

        # 3. Generate/Edit Code (Pass both text AND current_code)
        python_code = generate_code(english_text, current_code)
        
        return {
            "transcription": english_text,
            "code": python_code
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))