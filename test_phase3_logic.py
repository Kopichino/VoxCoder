
import os
import shutil
from src.llm_engine import generate_code

# Mocking the flow of main_phase3.py without audio recording

def test_phase3_flow():
    print("--- Testing Phase 3 Flow ---")
    
    # Setup: Clean existing generated script
    if os.path.exists("generated_script.py"):
        os.remove("generated_script.py")
        
    # Step 1: Create new script
    print("\n[Step 1] Creating new script...")
    instruction1 = "Create a python script that prints 'Initial Version'"
    
    # Logic from main_phase3
    current_code = ""
    # script doesn't exist yet
    
    code1 = generate_code(instruction1, current_code="")
    
    with open("generated_script.py", "w") as f:
        f.write(code1)
    print("Generated Code 1:\n", code1)
    
    # Step 2: Edit script
    print("\n[Step 2] Editing script...")
    instruction2 = "Change the print statement to say 'Edited Version'"
    
    # Logic from main_phase3
    if os.path.exists("generated_script.py"):
        with open("generated_script.py", "r") as f:
            current_code = f.read()
    
    code2 = generate_code(instruction2, current_code=current_code)
    
    with open("generated_script.py", "w") as f:
        f.write(code2)
        
    print("Generated Code 2:\n", code2)
    
    # Validation
    if "Edited Version" in code2 and "Initial Version" not in code2:
        print("\n✅ SUCCESS: Script was updated correctly.")
    else:
        print("\n❌ FAILURE: Script update failed.")

if __name__ == "__main__":
    test_phase3_flow()
