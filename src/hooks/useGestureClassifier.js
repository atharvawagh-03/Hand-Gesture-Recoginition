/**
 * useGestureClassifier.js — Multi-hand gesture classification hook
 * 
 * UPDATED: Classifies ALL detected hands independently.
 * Each hand gets its own motion tracker, cooldown state, and result.
 * Returns the best gesture across all hands for the output display.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { classifyGesture } from '../lib/gestureRules.js';
import { MotionTracker } from '../lib/motionTracker.js';
import gestureConfig from '../config/gestures.json';
import useSettingsStore from '../store/useSettingsStore.js';

export default function useGestureClassifier(allHands) {
  const confidenceThreshold = useSettingsStore(s => s.confidenceThreshold);
  const cooldownDuration = useSettingsStore(s => s.cooldownDuration);
  const addGestureToHistory = useSettingsStore(s => s.addGestureToHistory);

  const [currentGesture, setCurrentGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [rawResult, setRawResult] = useState(null);
  const [perHandResults, setPerHandResults] = useState([]);

  // Per-hand tracking state (keyed by hand index 0/1)
  const motionTrackersRef = useRef([new MotionTracker(), new MotionTracker()]);
  const lastGestureRef = useRef(null);
  const lastGestureTimeRef = useRef(0);
  const stableCountRef = useRef(0);
  const lastClassRef = useRef(null);
  const clearTimeoutRef = useRef(null);

  // Gesture config lookup
  const gestureMap = useMemo(() => {
    const map = {};
    gestureConfig.gestures.forEach(g => { map[g.id] = g; });
    return map;
  }, []);

  // Classification logic — runs every frame
  useEffect(() => {
    if (!allHands || allHands.length === 0) {
      // Clear motion trackers when no hands
      motionTrackersRef.current[0].clear();
      motionTrackersRef.current[1].clear();
      setRawResult(null);
      setPerHandResults([]);

      // Keep displaying last gesture for a moment, then clear
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = setTimeout(() => {
        setCurrentGesture(null);
        setConfidence(0);
        setIsRecognizing(false);
      }, 800);
      return () => {
        if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      };
    }

    // Cancel pending clear
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    // Classify EACH hand independently
    const handResults = [];

    for (let i = 0; i < allHands.length; i++) {
      const hand = allHands[i];
      const tracker = motionTrackersRef.current[i];

      // Feed landmarks to this hand's motion tracker
      tracker.addFrame(hand.landmarks);

      // Classify
      const result = classifyGesture(hand.landmarks, tracker);
      if (result) {
        handResults.push({
          ...result,
          handIndex: i,
          handedness: hand.handedness,
        });
      }
    }

    // Clear motion tracker for hands that disappeared
    for (let i = allHands.length; i < 2; i++) {
      motionTrackersRef.current[i].clear();
    }

    setPerHandResults(handResults);

    // Pick the best result across all hands
    if (handResults.length === 0) {
      setRawResult(null);
      stableCountRef.current = 0;
      lastClassRef.current = null;
      return;
    }

    handResults.sort((a, b) => b.confidence - a.confidence);
    const bestResult = handResults[0];
    setRawResult(bestResult);

    if (bestResult.confidence < confidenceThreshold) {
      // Below threshold — show confidence but don't fire
      setConfidence(bestResult.confidence);
      stableCountRef.current = 0;
      lastClassRef.current = null;
      return;
    }

    // Stability check: require same gesture for 2 consecutive frames (reduced from 3)
    if (bestResult.id === lastClassRef.current) {
      stableCountRef.current++;
    } else {
      stableCountRef.current = 1;
      lastClassRef.current = bestResult.id;
    }

    if (stableCountRef.current < 2) return;

    // Cooldown check
    const now = Date.now();
    if (
      bestResult.id === lastGestureRef.current &&
      now - lastGestureTimeRef.current < cooldownDuration * 1000
    ) {
      // Same gesture within cooldown — update confidence but don't re-fire
      setConfidence(bestResult.confidence);
      return;
    }

    // Fire gesture!
    const gestureInfo = gestureMap[bestResult.id];
    if (gestureInfo) {
      setCurrentGesture(gestureInfo);
      setConfidence(bestResult.confidence);
      setIsRecognizing(true);
      addGestureToHistory(gestureInfo, bestResult.confidence);
      lastGestureRef.current = bestResult.id;
      lastGestureTimeRef.current = now;
    }
  }, [allHands, confidenceThreshold, cooldownDuration, gestureMap, addGestureToHistory]);

  return {
    currentGesture,
    confidence,
    isRecognizing,
    rawResult,
    perHandResults, // Per-hand classification results for overlay display
  };
}
