import sounddevice as sd
from scipy.io.wavfile import write
import numpy as np

def record_audio(filename="recordings/input.wav", duration=5, fs=44100):
    """
    Records audio from the default microphone.
    
    Args:
        filename (str): Path to save the wav file.
        duration (int): Duration of recording in seconds.
        fs (int): Sampling frequency (44100 is standard).
    """
    print(f"🎤 Recording for {duration} seconds...")
    
    # sd.rec records in the background, we wait until it's done
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()  # Wait until recording is finished
    
    # Save as WAV file
    write(filename, fs, recording)
    print(f"✅ Audio saved to {filename}")
    return filename