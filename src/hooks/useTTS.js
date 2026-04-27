/**
 * useTTS.js — Text-to-Speech hook using Web Speech API
 * 
 * Wraps SpeechSynthesis with queue management, rate/volume controls,
 * and graceful fallback when API is unavailable.
 */

import { useCallback, useEffect, useRef } from 'react';
import useSettingsStore from '../store/useSettingsStore.js';

export default function useTTS() {
  const ttsEnabled = useSettingsStore(s => s.ttsEnabled);
  const ttsRate = useSettingsStore(s => s.ttsRate);
  const ttsVolume = useSettingsStore(s => s.ttsVolume);

  const synthRef = useRef(null);
  const isAvailableRef = useRef(false);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      isAvailableRef.current = true;
    } else {
      console.warn('Web Speech API not available in this browser.');
      isAvailableRef.current = false;
    }
  }, []);

  // Speak a text string
  const speak = useCallback((text) => {
    if (!ttsEnabled || !isAvailableRef.current || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;
    utterance.volume = ttsVolume;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Try to use a good voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))
    );
    if (preferred) utterance.voice = preferred;

    synthRef.current.speak(utterance);
  }, [ttsEnabled, ttsRate, ttsVolume]);

  // Stop speaking
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  return {
    speak,
    stop,
    isAvailable: isAvailableRef.current,
  };
}
