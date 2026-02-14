'use client';

import { useState, useCallback, useRef } from 'react';

const TTS_KEY = 'voxcoder_tts_enabled';

export function useTTS() {
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(TTS_KEY);
    return stored === null ? true : stored === 'true';
  });

  const speakingRef = useRef(false);

  const toggleTTS = useCallback(() => {
    setTtsEnabled(prev => {
      const next = !prev;
      localStorage.setItem(TTS_KEY, String(next));
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number }) => {
    if (!ttsEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.1;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = 0.8;

    // Pick a good English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { speakingRef.current = true; };
    utterance.onend = () => { speakingRef.current = false; };
    utterance.onerror = () => { speakingRef.current = false; };

    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
  }, []);

  return { ttsEnabled, toggleTTS, speak, stop };
}
