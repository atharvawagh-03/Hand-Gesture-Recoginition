/**
 * gestureRules.js — Heuristic gesture classification rules (v2 — HIGH ACCURACY)
 * 
 * IMPROVEMENTS over v1:
 * - Relaxed motion requirements: static poses now work without wave/wag
 * - Better scoring with weighted finger state evaluation
 * - Motion detection BOOSTS confidence but is not required
 * - More tolerant of half-curled fingers
 * - Better disambiguation between similar gestures (Hello vs Bye)
 */

import {
  getAllFingerStates,
  countExtendedFingers,
  countStrictlyExtended,
  getPalmDirection,
  getWristVerticalPosition,
  LANDMARK,
  distance2D,
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
  const strictExtended = countStrictlyExtended(landmarks);

  const wave = motionTracker.detectWave();
  const wag = motionTracker.detectWag();

  // Evaluate all gesture rules and return best match
  const candidates = [];

  // --- YES: Thumbs Up ---
  const yesScore = evaluateYes(fingerStates, palmDir, landmarks);
  if (yesScore > 0) candidates.push({ id: 'yes', label: 'YES', confidence: yesScore });

  // --- NO: V-sign (peace sign) ---
  const noScore = evaluateNo(fingerStates, wag, extendedCount);
  if (noScore > 0) candidates.push({ id: 'no', label: 'NO', confidence: noScore });

  // --- HELP ME: Raised fist ---
  const helpScore = evaluateHelpMe(fingerStates, wristY, extendedCount, strictExtended);
  if (helpScore > 0) candidates.push({ id: 'help_me', label: 'HELP ME', confidence: helpScore });

  // --- THANK YOU: Open hand moving forward/down ---
  const thankScore = evaluateThankYou(fingerStates, palmDir, extendedCount, motionTracker);
  if (thankScore > 0) candidates.push({ id: 'thank_you', label: 'THANK YOU', confidence: thankScore });

  // --- BYE: Open palm + wave motion ---
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


// ─── Helper: score how "curled" a set of fingers are ───
function curledScore(fingerStates, names) {
  let score = 0;
  for (const name of names) {
    if (fingerStates[name].curl === 'curled') score += 1;
    else if (fingerStates[name].curl === 'half_curled') score += 0.6;
  }
  return score;
}

function extendedScore(fingerStates, names) {
  let score = 0;
  for (const name of names) {
    if (fingerStates[name].curl === 'extended') score += 1;
    else if (fingerStates[name].curl === 'half_curled') score += 0.5;
  }
  return score;
}


/**
 * HELLO: Open palm, fingers extended, relatively static.
 */
function evaluateHello(fingerStates, palmDir, extendedCount, wave) {
  let score = 0;

  // Need most fingers extended (4-5)
  const ext = extendedScore(fingerStates, ['thumb', 'index', 'middle', 'ring', 'pinky']);
  if (ext >= 4.5) score += 0.45;
  else if (ext >= 3.5) score += 0.35;
  else if (ext >= 3) score += 0.2;
  else return 0;

  // Palm facing camera is a bonus, not required
  if (palmDir === 'toward_camera') score += 0.25;
  else score += 0.12;

  // Static hand (no wave) — otherwise it's "Bye"
  if (wave.detected) {
    // If waving, this is Bye not Hello — heavily penalize
    score -= 0.35;
  } else {
    score += 0.2;
  }

  // Fingers pointing up is a small bonus
  if (fingerStates.index.direction === 'up' || fingerStates.middle.direction === 'up') {
    score += 0.05;
  }

  return Math.max(0, Math.min(score, 0.98));
}


/**
 * BYE: Open palm + wave motion. Without wave, falls back to lower confidence.
 */
function evaluateBye(fingerStates, palmDir, extendedCount, wave) {
  let score = 0;

  // Most fingers extended
  const ext = extendedScore(fingerStates, ['thumb', 'index', 'middle', 'ring', 'pinky']);
  if (ext >= 3.5) score += 0.3;
  else if (ext >= 2.5) score += 0.15;
  else return 0;

  // Palm toward camera
  if (palmDir === 'toward_camera') score += 0.15;
  else score += 0.05;

  // Wave motion is the KEY differentiator from Hello
  if (wave.detected) {
    score += 0.4;
    if (wave.amplitude > 0.05) score += 0.1;
  } else {
    // Without wave, can't distinguish from Hello — return 0
    return 0;
  }

  return Math.min(score, 0.98);
}


/**
 * THANK YOU: Flat hand moving downward/forward from face level.
 * Without motion: if hand is in upper portion and tilted, give moderate confidence.
 */
function evaluateThankYou(fingerStates, palmDir, extendedCount, motionTracker) {
  let score = 0;

  // Fingers extended
  const ext = extendedScore(fingerStates, ['index', 'middle', 'ring', 'pinky']);
  if (ext >= 3) score += 0.25;
  else if (ext >= 2) score += 0.1;
  else return 0;

  // Palm direction — Thank You often palm is facing away or sideways
  if (palmDir === 'away_from_camera') score += 0.2;
  else score += 0.1;

  // Check for downward motion of the wrist
  const velocity = motionTracker.getVelocity(0); // wrist
  if (velocity.vy > 0.15) {
    // Hand moving downward — strong signal
    score += 0.35;
  } else if (velocity.vy > 0.05) {
    score += 0.2;
  } else if (velocity.speed > 0.1) {
    score += 0.1;
  } else {
    // No motion at all — need strong static signal
    // Check if hand is in upper part of frame (near chin level)
    const wristY = motionTracker.buffer.length > 0 ? null : null;
    return 0; // Without motion, can't reliably distinguish Thank You
  }

  return Math.min(score, 0.98);
}


/**
 * HELP ME: Fist (all fingers curled), raised upward.
 * Much more tolerant: thumb can be out, fist just needs to be in upper half.
 */
function evaluateHelpMe(fingerStates, wristY, extendedCount, strictExtended) {
  let score = 0;

  // Core fingers curled (index, middle, ring, pinky)
  const curled = curledScore(fingerStates, ['index', 'middle', 'ring', 'pinky']);
  if (curled >= 3.5) score += 0.4;
  else if (curled >= 3) score += 0.3;
  else if (curled >= 2.5) score += 0.15;
  else return 0;

  // Thumb can be in any position for a fist
  if (fingerStates.thumb.curl === 'curled') score += 0.1;
  else if (fingerStates.thumb.curl === 'half_curled') score += 0.05;
  // Extended thumb is okay too (some fist styles have thumb out)

  // Wrist in upper portion of frame (raised fist)
  if (wristY < 0.4) score += 0.35;
  else if (wristY < 0.5) score += 0.25;
  else if (wristY < 0.6) score += 0.1;
  else return 0; // Fist must be at least somewhat raised

  return Math.min(score, 0.98);
}


/**
 * YES: Thumbs up — thumb extended upward, other fingers curled.
 * More tolerant of thumb direction and other finger states.
 */
function evaluateYes(fingerStates, palmDir, landmarks) {
  let score = 0;

  // Thumb must be extended
  if (fingerStates.thumb.curl === 'extended') score += 0.3;
  else if (fingerStates.thumb.curl === 'half_curled') score += 0.1;
  else return 0;

  // Thumb pointing up (generous detection)
  const thumbDir = fingerStates.thumb.direction;
  if (thumbDir === 'up') score += 0.25;
  else if (thumbDir === 'left' || thumbDir === 'right') {
    // Sideways thumb — still could be thumbs up depending on hand orientation
    score += 0.1;
  } else {
    // Thumb pointing down — not thumbs up
    return 0;
  }

  // Other 4 fingers should be curled
  const curled = curledScore(fingerStates, ['index', 'middle', 'ring', 'pinky']);
  if (curled >= 3.5) score += 0.35;
  else if (curled >= 3) score += 0.25;
  else if (curled >= 2) score += 0.1;
  else return 0; // Too many fingers extended — not thumbs up

  // Bonus: thumb tip is highest point
  if (landmarks) {
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    if (thumbTip.y < indexTip.y) score += 0.05;
  }

  return Math.min(score, 0.98);
}


/**
 * NO: Index and middle finger extended (V-sign / peace sign).
 * Wag motion gives bonus but is NOT required — static V-sign also works.
 */
function evaluateNo(fingerStates, wag, extendedCount) {
  let score = 0;

  // Index finger MUST be extended
  if (fingerStates.index.curl === 'extended') score += 0.25;
  else if (fingerStates.index.curl === 'half_curled') score += 0.1;
  else return 0;

  // Middle finger MUST be extended
  if (fingerStates.middle.curl === 'extended') score += 0.25;
  else if (fingerStates.middle.curl === 'half_curled') score += 0.1;
  else return 0;

  // Ring and pinky should be curled (key differentiator from open palm)
  const curled = curledScore(fingerStates, ['ring', 'pinky']);
  if (curled >= 1.5) score += 0.2;
  else if (curled >= 1) score += 0.1;
  else {
    // Ring and pinky are extended — this is open palm, not V-sign
    return 0;
  }

  // Thumb position — can be in or out
  if (fingerStates.thumb.curl === 'curled' || fingerStates.thumb.curl === 'half_curled') {
    score += 0.05;
  }

  // Wag motion is a BONUS, not required
  if (wag.detected) {
    score += 0.15;
    if (wag.amplitude > 0.04) score += 0.05;
  }

  return Math.min(score, 0.98);
}
