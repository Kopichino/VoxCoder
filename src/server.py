from fastapi import FastAPI, UploadFile, File, HTTPException
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
async def process_audio_endpoint(file: UploadFile = File(...)):
    """
    Receives an audio file (blob) from the frontend,
    transcribes it, and generates Python code.
    """
    try:
        # 1. Save the uploaded file temporarily
        temp_filename = f"recordings/{file.filename}"
        
        # Ensure directory exists
        if not os.path.exists("recordings"):
            os.makedirs("recordings")
            
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"📥 Received file: {temp_filename}")

        # 2. Transcribe (The Ear)
        english_text = transcribe_audio(temp_filename)
        print(f"🗣️ Transcription: {english_text}")

        # 3. Generate Code (The Brain)
        python_code = generate_code(english_text)
        
        # 4. Return JSON response
        return {
            "transcription": english_text,
            "code": python_code
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))