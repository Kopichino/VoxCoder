
from src.llm_engine import generate_code
import os

# Create a dummy generated_script.py for testing
initial_code = """
def hello():
    print("Hello")
    x = 10
    print(x)
"""

print("--- Initial Code ---")
print(initial_code)

# Simulate user instruction
instruction = "change line 4 from x = 10 to x = 20"

print(f"\n--- Instruction: {instruction} ---")

# Call generating code with context
# Note: verify that generate_code accepts 2 args
new_code = generate_code(instruction, current_code=initial_code)

print("\n--- New Code ---")
print(new_code)
