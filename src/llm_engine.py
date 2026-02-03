import os
from groq import Groq
from dotenv import load_dotenv
# ------------------------------------------------------------------
# 🔑 SECURITY NOTE: In a real app, use os.environ.get("GROQ_API_KEY")
# For this student project, you can paste your key below safely.
# ------------------------------------------------------------------
load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY") 

def generate_code(prompt):
    """
    Sends text to Llama 3 on Groq and returns clean Python code.
    """
    print("🧠 Sending to Llama 3 (via Groq)...")
    
    client = Groq(api_key=API_KEY)

    # We use a "System Prompt" to tell the AI how to behave
    system_instruction = (
        "You are an expert Python coding assistant. "
        "The user will give you a logic or algorithm in plain English. "
        "You must output ONLY valid Python code. "
        "Do not explain the code. Do not wrap in markdown backticks (```). "
        "Just raw code."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast and smart enough model
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature = more precise code
        )
        
        code = completion.choices[0].message.content
        print("✅ Code generated!")
        return code

    except Exception as e:
        print(f"❌ Error generating code: {e}")
        return "# Error generating code."