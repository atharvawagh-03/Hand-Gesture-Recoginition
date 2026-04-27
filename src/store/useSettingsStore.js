/**
 * useSettingsStore.js — Zustand state management with localStorage persistence
 * 
 * Central store for all app settings, gesture history, and UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // --- Recognition Settings ---
      confidenceThreshold: 0.85,
      cooldownDuration: 1.5, // seconds
      
      // --- Camera Settings ---
      mirrorMode: true,
      selectedCamera: null, // null = system default

      // --- TTS Settings ---
      ttsEnabled: true,
      ttsRate: 1.0,
      ttsVolume: 1.0,

      // --- UI State ---
      onboardingCompleted: false,
      settingsPanelOpen: false,
      
      // --- Gesture History ---
      gestureHistory: [],

      // --- Actions ---
      updateSetting: (key, value) => set({ [key]: value }),
      
      toggleTTS: () => set(state => ({ ttsEnabled: !state.ttsEnabled })),
      
      toggleMirror: () => set(state => ({ mirrorMode: !state.mirrorMode })),
      
      toggleSettings: () => set(state => ({ settingsPanelOpen: !state.settingsPanelOpen })),
      
      openSettings: () => set({ settingsPanelOpen: true }),
      
      closeSettings: () => set({ settingsPanelOpen: false }),
      
      completeOnboarding: () => set({ onboardingCompleted: true }),
      
      resetOnboarding: () => set({ onboardingCompleted: false }),

      addGestureToHistory: (gesture, confidence) => {
        set(state => {
          const entry = {
            id: Date.now(),
            gesture: gesture.id,
            label: gesture.label,
            color: gesture.color,
            confidence: Math.round(confidence * 100),
            timestamp: new Date().toLocaleTimeString(),
          };
          const newHistory = [entry, ...state.gestureHistory].slice(0, 20);
          return { gestureHistory: newHistory };
        });
      },

      clearHistory: () => set({ gestureHistory: [] }),
    }),
    {
      name: 'hsrs-settings',
      // Only persist settings, not transient UI state
      partialize: (state) => ({
        confidenceThreshold: state.confidenceThreshold,
        cooldownDuration: state.cooldownDuration,
        mirrorMode: state.mirrorMode,
        selectedCamera: state.selectedCamera,
        ttsEnabled: state.ttsEnabled,
        ttsRate: state.ttsRate,
        ttsVolume: state.ttsVolume,
        onboardingCompleted: state.onboardingCompleted,
        gestureHistory: state.gestureHistory,
      }),
    }
  )
);

export default useSettingsStore;
