/**
 * landmarkUtils.js — Hand landmark analysis utilities
 * 
 * MediaPipe HandLandmarker returns 21 3D landmarks per hand.
 * This module provides normalization, angle calculation, and
 * finger state estimation from raw landmark data.
 * 
 * IMPROVED: Uses dual-method finger curl detection (angle-based + 
 * distance-based) for much higher accuracy across varied hand poses.
 */

// MediaPipe Hand Landmark indices
export const LANDMARK = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

// Finger definitions: [MCP, PIP, DIP, TIP]
export const FINGERS = {
  THUMB:  [LANDMARK.THUMB_CMC,  LANDMARK.THUMB_MCP,  LANDMARK.THUMB_IP,   LANDMARK.THUMB_TIP],
  INDEX:  [LANDMARK.INDEX_MCP,  LANDMARK.INDEX_PIP,  LANDMARK.INDEX_DIP,  LANDMARK.INDEX_TIP],
  MIDDLE: [LANDMARK.MIDDLE_MCP, LANDMARK.MIDDLE_PIP, LANDMARK.MIDDLE_DIP, LANDMARK.MIDDLE_TIP],
  RING:   [LANDMARK.RING_MCP,   LANDMARK.RING_PIP,   LANDMARK.RING_DIP,   LANDMARK.RING_TIP],
  PINKY:  [LANDMARK.PINKY_MCP,  LANDMARK.PINKY_PIP,  LANDMARK.PINKY_DIP,  LANDMARK.PINKY_TIP],
};

// Skeletal connections for drawing
export const CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

/**
 * Calculate the 3D distance between two landmark points.
 */
export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the 2D distance between two landmark points (ignoring z).
 */
export function distance2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle (in degrees) at point p2, between vectors p1→p2 and p3→p2.
 */
export function calculateAngle(p1, p2, p3) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0) };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Determine if a finger is extended using a HYBRID approach:
 * 1) Angle-based: PIP and DIP joint angles
 * 2) Distance-based: Is the fingertip farther from wrist than the PIP joint?
 * 
 * The distance check is much more reliable for varied hand orientations.
 * Returns: 'extended' | 'half_curled' | 'curled'
 */
export function getFingerCurl(landmarks, fingerJoints) {
  const [mcp, pip, dip, tip] = fingerJoints.map(i => landmarks[i]);
  const wrist = landmarks[LANDMARK.WRIST];

  // --- Method 1: Angle-based ---
  const pipAngle = calculateAngle(mcp, pip, dip);
  const dipAngle = calculateAngle(pip, dip, tip);
  const avgAngle = (pipAngle + dipAngle) / 2;

  // --- Method 2: Distance-based (more reliable for many orientations) ---
  // If the tip is farther from the wrist than the MCP, finger is likely extended
  const tipToWrist = distance2D(tip, wrist);
  const mcpToWrist = distance2D(mcp, wrist);
  const tipToMcp = distance2D(tip, mcp);
  const pipToMcp = distance2D(pip, mcp);

  // Is tip above PIP? (in y-coordinate, lower y = higher on screen)
  // For upward fingers, tip.y < pip.y
  // But this is orientation dependent, so use distance ratio instead
  const tipFarther = tipToWrist > mcpToWrist * 0.85;
  const tipExtended = tipToMcp > pipToMcp * 0.7;

  // --- Combine both methods ---
  let score = 0;

  // Angle contribution
  if (avgAngle > 150) score += 2;
  else if (avgAngle > 130) score += 1.5;
  else if (avgAngle > 110) score += 1;
  else if (avgAngle > 80) score += 0.5;

  // Distance contribution
  if (tipFarther && tipExtended) score += 2;
  else if (tipFarther || tipExtended) score += 1;

  if (score >= 3) return 'extended';
  if (score >= 1.5) return 'half_curled';
  return 'curled';
}

/**
 * Special thumb curl detection (thumb mechanics differ from other fingers).
 * Uses multiple heuristics for reliability.
 */
export function getThumbCurl(landmarks) {
  const wrist = landmarks[LANDMARK.WRIST];
  const cmc = landmarks[LANDMARK.THUMB_CMC];
  const mcp = landmarks[LANDMARK.THUMB_MCP];
  const ip = landmarks[LANDMARK.THUMB_IP];
  const tip = landmarks[LANDMARK.THUMB_TIP];
  const indexMcp = landmarks[LANDMARK.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARK.PINKY_MCP];

  // Palm center
  const palmCenter = {
    x: (indexMcp.x + pinkyMcp.x + wrist.x) / 3,
    y: (indexMcp.y + pinkyMcp.y + wrist.y) / 3,
    z: ((indexMcp.z || 0) + (pinkyMcp.z || 0) + (wrist.z || 0)) / 3,
  };

  // Distance checks
  const tipToPalm = distance2D(tip, palmCenter);
  const mcpToPalm = distance2D(mcp, palmCenter);
  const tipToIndex = distance2D(tip, indexMcp);
  const wristToIndex = distance2D(wrist, indexMcp);

  // Angle check
  const angle = calculateAngle(cmc, mcp, ip);
  const angle2 = calculateAngle(mcp, ip, tip);
  const totalAngle = (angle + angle2) / 2;

  let score = 0;

  // Angle-based
  if (totalAngle > 140) score += 2;
  else if (totalAngle > 120) score += 1.5;
  else if (totalAngle > 100) score += 1;
  else score += 0.3;

  // Distance-based: thumb tip far from palm center
  if (tipToPalm > mcpToPalm * 1.0) score += 1.5;
  else if (tipToPalm > mcpToPalm * 0.7) score += 0.8;

  // Distance-based: thumb tip far from index finger base
  if (tipToIndex > wristToIndex * 0.5) score += 0.5;

  if (score >= 3) return 'extended';
  if (score >= 1.8) return 'half_curled';
  return 'curled';
}

/**
 * Get the direction a finger is pointing.
 * Returns: 'up' | 'down' | 'left' | 'right'
 */
export function getFingerDirection(landmarks, fingerJoints) {
  const mcp = landmarks[fingerJoints[0]];
  const tip = landmarks[fingerJoints[3]];

  const dx = tip.x - mcp.x;
  const dy = tip.y - mcp.y;

  if (Math.abs(dy) > Math.abs(dx)) {
    return dy < 0 ? 'up' : 'down';
  }
  return dx > 0 ? 'right' : 'left';
}

/**
 * Get thumb direction — considers special thumb axis.
 */
export function getThumbDirection(landmarks) {
  const wrist = landmarks[LANDMARK.WRIST];
  const mcp = landmarks[LANDMARK.THUMB_MCP];
  const tip = landmarks[LANDMARK.THUMB_TIP];

  // Use MCP→TIP vector for more accurate thumb direction
  const dx = tip.x - mcp.x;
  const dy = tip.y - mcp.y;

  // More generous "up" detection for thumb — it's often at an angle
  if (dy < -0.01 && Math.abs(dy) > Math.abs(dx) * 0.5) return 'up';
  if (dy > 0.01 && Math.abs(dy) > Math.abs(dx) * 0.5) return 'down';
  return dx > 0 ? 'right' : 'left';
}

/**
 * Get the full state of all 5 fingers.
 * Returns an object with curl state and direction for each finger.
 */
export function getAllFingerStates(landmarks) {
  return {
    thumb: {
      curl: getThumbCurl(landmarks),
      direction: getThumbDirection(landmarks),
    },
    index: {
      curl: getFingerCurl(landmarks, FINGERS.INDEX),
      direction: getFingerDirection(landmarks, FINGERS.INDEX),
    },
    middle: {
      curl: getFingerCurl(landmarks, FINGERS.MIDDLE),
      direction: getFingerDirection(landmarks, FINGERS.MIDDLE),
    },
    ring: {
      curl: getFingerCurl(landmarks, FINGERS.RING),
      direction: getFingerDirection(landmarks, FINGERS.RING),
    },
    pinky: {
      curl: getFingerCurl(landmarks, FINGERS.PINKY),
      direction: getFingerDirection(landmarks, FINGERS.PINKY),
    },
  };
}

/**
 * Count the number of extended fingers (including half_curled as 0.5).
 */
export function countExtendedFingers(landmarks) {
  const states = getAllFingerStates(landmarks);
  let count = 0;
  for (const finger of Object.values(states)) {
    if (finger.curl === 'extended') count++;
    else if (finger.curl === 'half_curled') count += 0.5;
  }
  return count;
}

/**
 * Count strictly extended fingers (not half curled).
 */
export function countStrictlyExtended(landmarks) {
  const states = getAllFingerStates(landmarks);
  let count = 0;
  for (const finger of Object.values(states)) {
    if (finger.curl === 'extended') count++;
  }
  return count;
}

/**
 * Get the palm facing direction (toward or away from camera).
 * Uses cross product of palm plane vectors to determine normal.
 */
export function getPalmDirection(landmarks) {
  const wrist = landmarks[LANDMARK.WRIST];
  const indexMcp = landmarks[LANDMARK.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARK.PINKY_MCP];

  // Two vectors on the palm plane
  const v1 = {
    x: indexMcp.x - wrist.x,
    y: indexMcp.y - wrist.y,
    z: (indexMcp.z || 0) - (wrist.z || 0),
  };
  const v2 = {
    x: pinkyMcp.x - wrist.x,
    y: pinkyMcp.y - wrist.y,
    z: (pinkyMcp.z || 0) - (wrist.z || 0),
  };

  // Cross product gives palm normal
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  // Positive z-normal means palm faces camera
  return normal.z > 0 ? 'toward_camera' : 'away_from_camera';
}

/**
 * Get the vertical position of the wrist (0 = top, 1 = bottom of frame).
 */
export function getWristVerticalPosition(landmarks) {
  return landmarks[LANDMARK.WRIST].y;
}

/**
 * Normalize landmarks relative to wrist (translate wrist to origin).
 */
export function normalizeLandmarks(landmarks) {
  const wrist = landmarks[LANDMARK.WRIST];
  return landmarks.map(lm => ({
    x: lm.x - wrist.x,
    y: lm.y - wrist.y,
    z: (lm.z || 0) - (wrist.z || 0),
  }));
}
