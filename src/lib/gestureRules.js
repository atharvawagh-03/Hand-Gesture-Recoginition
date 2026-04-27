/**
 * gestureRules.js — Heuristic gesture classification rules
 * 
 * Each gesture is defined by a set of rules applied to finger states,
 * palm orientation, hand position, and motion patterns.
 * 
 * Returns an array of { id, label, confidence } matches.
 */

import {
  getAllFingerStates,
  countExtendedFingers,
  getPalmDirection,
  getWristVerticalPosition,
} from './landmarkUtils.js';

/**
 * Classify landmarks into a gesture using heuristic rules.
 * @param {Array} landmarks — 21 MediaPipe hand landmarks
 * @param {MotionTracker} motionTracker — motion tracker instance
 * @returns {{ id: string, label: string, confidence: number } | null}
 */
export function classifyGesture(landmarks, motionTracker) {
  if (!landmarks || landmarks.length < 21) return null;

  const fingerStates = getAllFingerStates(landmarks);
  const palmDir = getPalmDirection(landmarks);
  const wristY = getWristVerticalPosition(landmarks);
  const extendedCount = countExtendedFingers(landmarks);

  const wave = motionTracker.detectWave();
  const wag = motionTracker.detectWag();

  // Evaluate all gesture rules and return best match
  const candidates = [];

  // --- YES: Thumbs Up ---
  const yesScore = evaluateYes(fingerStates, palmDir);
  if (yesScore > 0) candidates.push({ id: 'yes', label: 'YES', confidence: yesScore });

  // --- NO: V-sign with wag ---
  const noScore = evaluateNo(fingerStates, wag);
  if (noScore > 0) candidates.push({ id: 'no', label: 'NO', confidence: noScore });

  // --- HELP ME: Raised fist ---
  const helpScore = evaluateHelpMe(fingerStates, wristY, extendedCount);
  if (helpScore > 0) candidates.push({ id: 'help_me', label: 'HELP ME', confidence: helpScore });

  // --- THANK YOU: Open hand + forward motion ---
  const thankScore = evaluateThankYou(fingerStates, palmDir, extendedCount, motionTracker);
  if (thankScore > 0) candidates.push({ id: 'thank_you', label: 'THANK YOU', confidence: thankScore });

  // --- BYE: Open palm + wave ---
  const byeScore = evaluateBye(fingerStates, palmDir, extendedCount, wave);
  if (byeScore > 0) candidates.push({ id: 'bye', label: 'BYE', confidence: byeScore });

  // --- HELLO: Open palm, static ---
  const helloScore = evaluateHello(fingerStates, palmDir, extendedCount, wave);
  if (helloScore > 0) candidates.push({ id: 'hello', label: 'HELLO', confidence: helloScore });

  // Return highest confidence match
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}


/**
 * HELLO: All fingers extended, palm toward camera, no significant motion.
 */
function evaluateHello(fingerStates, palmDir, extendedCount, wave) {
  let score = 0;

  // All 5 fingers extended
  if (extendedCount === 5) score += 0.4;
  else if (extendedCount === 4) score += 0.2;
  else return 0;

  // Palm facing camera
  if (palmDir === 'toward_camera') score += 0.3;
  else score += 0.1;

  // NO significant wave motion (that would be "Bye")
  if (!wave.detected) score += 0.25;
  else return 0; // Wave detected → this is "Bye", not "Hello"

  // Fingers pointing up
  if (fingerStates.index.direction === 'up' || fingerStates.middle.direction === 'up') {
    score += 0.05;
  }

  return Math.min(score, 0.98);
}


/**
 * BYE: Open palm + horizontal wave motion detected.
 */
function evaluateBye(fingerStates, palmDir, extendedCount, wave) {
  let score = 0;

  // Most fingers extended
  if (extendedCount >= 4) score += 0.3;
  else if (extendedCount >= 3) score += 0.15;
  else return 0;

  // Palm toward camera
  if (palmDir === 'toward_camera') score += 0.2;
  else score += 0.05;

  // Wave motion is the key differentiator
  if (wave.detected) {
    score += 0.35;
    // Higher amplitude = higher confidence
    if (wave.amplitude > 0.06) score += 0.1;
  } else {
    return 0; // No wave = not "Bye"
  }

  return Math.min(score, 0.98);
}


/**
 * THANK YOU: All fingers extended, hand moving forward/down.
 */
function evaluateThankYou(fingerStates, palmDir, extendedCount, motionTracker) {
  let score = 0;

  // Fingers extended
  if (extendedCount >= 4) score += 0.3;
  else return 0;

  // Palm direction — "Thank You" often has palm facing sideways or slightly forward
  score += 0.15;

  // Check for forward/downward motion
  const velocity = motionTracker.getVelocity(0); // wrist
  if (velocity.vy > 0.3) {
    // Hand moving downward
    score += 0.35;
  } else if (velocity.speed > 0.2) {
    score += 0.15;
  } else {
    return 0; // No motion → not "Thank You" (would be Hello instead)
  }

  // Fingers pointing up or forward
  if (fingerStates.index.direction === 'up') score += 0.05;

  return Math.min(score, 0.98);
}


/**
 * HELP ME: Fist raised upward (single-hand variant).
 * All fingers curled, wrist above center of frame.
 */
function evaluateHelpMe(fingerStates, wristY, extendedCount) {
  let score = 0;

  // All fingers curled (fist)
  if (extendedCount === 0) score += 0.45;
  else if (extendedCount === 1 && fingerStates.thumb.curl !== 'extended') score += 0.25;
  else return 0;

  // Wrist above midpoint of frame (raised fist)
  if (wristY < 0.45) score += 0.35;
  else if (wristY < 0.55) score += 0.15;
  else return 0; // Fist not raised

  // Thumb can be tucked or slightly out
  if (fingerStates.thumb.curl === 'curled' || fingerStates.thumb.curl === 'half_curled') {
    score += 0.1;
  }

  return Math.min(score, 0.98);
}


/**
 * YES: Thumbs up — thumb extended upward, all other fingers curled.
 */
function evaluateYes(fingerStates, palmDir) {
  let score = 0;

  // Thumb extended
  if (fingerStates.thumb.curl === 'extended') score += 0.35;
  else return 0;

  // Thumb pointing up
  if (fingerStates.thumb.direction === 'up') score += 0.2;
  else if (fingerStates.thumb.direction === 'left' || fingerStates.thumb.direction === 'right') {
    score += 0.05; // Slightly sideways thumb is still okay
  } else {
    return 0;
  }

  // Other fingers curled
  const otherFingers = ['index', 'middle', 'ring', 'pinky'];
  let curledCount = 0;
  for (const f of otherFingers) {
    if (fingerStates[f].curl === 'curled') curledCount++;
    else if (fingerStates[f].curl === 'half_curled') curledCount += 0.5;
  }

  if (curledCount >= 3.5) score += 0.35;
  else if (curledCount >= 2.5) score += 0.2;
  else return 0;

  return Math.min(score, 0.98);
}


/**
 * NO: Index and middle finger extended (V-sign / peace), 
 * with horizontal wag motion.
 */
function evaluateNo(fingerStates, wag) {
  let score = 0;

  // Index extended
  if (fingerStates.index.curl === 'extended') score += 0.2;
  else return 0;

  // Middle extended
  if (fingerStates.middle.curl === 'extended') score += 0.2;
  else return 0;

  // Ring and pinky curled
  if (fingerStates.ring.curl === 'curled' || fingerStates.ring.curl === 'half_curled') score += 0.1;
  if (fingerStates.pinky.curl === 'curled' || fingerStates.pinky.curl === 'half_curled') score += 0.1;

  // Wag motion is key differentiator
  if (wag.detected) {
    score += 0.3;
    if (wag.amplitude > 0.05) score += 0.08;
  } else {
    // V-sign without wag — reduce confidence but still allow if strong pose
    score -= 0.15;
  }

  return Math.max(0, Math.min(score, 0.98));
}
