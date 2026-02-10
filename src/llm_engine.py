import os
from groq import Groq
from dotenv import load_dotenv
# ------------------------------------------------------------------
# 🔑 SECURITY NOTE: In a real app, use os.environ.get("GROQ_API_KEY")
# For this student project, you can paste your key below safely.
# ------------------------------------------------------------------
load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY") 

def generate_code(prompt, current_code=""):
    """
    Generates or Edits code based on the user's instruction.
    """
    if not API_KEY:
        return "# Error: Missing API Key"

    print(f"🧠 Sending to Llama 3.1...")

    # logic: If there is code, we are EDITING. If not, we are CREATING.
    if current_code and current_code.strip() != "":
        system_instruction = (
            "You are an expert Python code editor. "
            "You will be given 'Current Code' and a 'User Instruction'. "
            "Your job is to apply the user's instruction to the Current Code. "
            "Return the FULL updated code. Do not shorten it. "
            "Output ONLY valid Python code. No markdown."
        )
        user_content = f"Current Code:\n{current_code}\n\nUser Instruction:\n{prompt}"
    else:
        system_instruction = (
            "You are an expert Python coding assistant. "
            "Output ONLY valid Python code based on the user's instruction. "
            "No markdown, no explanations."
        )
        user_content = prompt

    try:
        client = Groq(api_key=API_KEY)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"❌ Error: {e}")
        return "# Error generating code."