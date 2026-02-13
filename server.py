from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import subprocess
from src.llm_engine import generate_code
from src.transcriber import transcribe_audio

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# Ensure recordings directory exists
if not os.path.exists("recordings"):
    os.makedirs("recordings")

# Global path to the generated script
SCRIPT_PATH = "generated_script.py"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/code", methods=["GET"])
def get_code():
    """Returns the current content of generated_script.py"""
    if os.path.exists(SCRIPT_PATH):
        with open(SCRIPT_PATH, "r") as f:
            code = f.read()
        return jsonify({"code": code})
    return jsonify({"code": "# No script generated yet."})

@app.route("/api/save", methods=["POST"])
def save_code():
    """Saves the code from the editor to generated_script.py"""
    data = request.json
    code = data.get("code", "")
    with open(SCRIPT_PATH, "w") as f:
        f.write(code)
    return jsonify({"status": "saved"})

@app.route("/api/run", methods=["POST"])
def run_code():
    """Executes the generated_script.py and returns output"""
    input_data = request.json.get("input", "")
    
    # Ensure the script exists
    if not os.path.exists(SCRIPT_PATH):
        return jsonify({"output": "Error: No script found to run."})

    try:
        # Run the script using subprocess
        # We pass input_data to stdin if provided
        result = subprocess.run(
            ["python", SCRIPT_PATH],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=10 # 10 second timeout to prevent infinite loops
        )
        
        output = result.stdout
        if result.stderr:
            output += "\nError:\n" + result.stderr
            
        return jsonify({"output": output})
        
    except subprocess.TimeoutExpired:
        return jsonify({"output": "Error: Execution timed out (limit: 10s)."})
    except Exception as e:
        return jsonify({"output": f"Error executing script: {str(e)}"})

@app.route("/api/process_voice", methods=["POST"])
def process_voice():
    """Receives audio blob, transcibes, and updates code"""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    # Save temp audio file
    temp_path = os.path.join("recordings", "web_input.wav")
    audio_file.save(temp_path)
    
    # 1. Transcribe
    print("🎙️ Transcribing audio from web...")
    text = transcribe_audio(temp_path)
    print(f"📝 Text: {text}")
    
    if not text:
        return jsonify({"error": "No speech detected"}), 400

    # 2. Get current code context
    current_code = ""
    current_code = request.form.get("currentCode", "")
    
    if not current_code and os.path.exists(SCRIPT_PATH):
         with open(SCRIPT_PATH, "r") as f:
            current_code = f.read()

    # 3. Generate/Edit
    print("🧠 Sending to LLM...")
    new_code = generate_code(text, current_code=current_code)
    
    # 4. Save to file
    with open(SCRIPT_PATH, "w") as f:
        f.write(new_code)
        
    return jsonify({
        "status": "success",
        "transcription": text,
        "code": new_code
    })

if __name__ == "__main__":
    print("🚀 Starting Web IDE at http://localhost:5000")
    app.run(debug=True, port=5000)
