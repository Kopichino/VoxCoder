# debug_env.py
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GROQ_API_KEY")

print(f"--- DEBUG INFO ---")
print(f"Current Working Directory: {os.getcwd()}")
if key:
    print(f"Key Found: Yes")
    print(f"Key starts with: {key[:4]}...")
    print(f"Key length: {len(key)}")
else:
    print("❌ Key Found: NO (It is None)")