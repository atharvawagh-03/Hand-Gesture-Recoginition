/**
 * motionTracker.js — Track hand landmark motion across frames
 * 
 * Maintains a circular buffer of landmark positions to detect
 * motion patterns like waving, nodding, and wagging.
 */

const BUFFER_SIZE = 20; // ~0.67s at 30fps

export class MotionTracker {
  constructor() {
    this.buffer = [];
    this.timestamps = [];
  }

  /**
   * Add a new frame of landmark data to the buffer.
   */
  addFrame(landmarks) {
    const now = performance.now();
    this.buffer.push(landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z || 0 })));
    this.timestamps.push(now);

    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer.shift();
      this.timestamps.shift();
    }
  }

  /**
   * Get the average velocity of a specific landmark over the buffer.
   * Returns { vx, vy, speed }
   */
  getVelocity(landmarkIndex) {
    if (this.buffer.length < 3) return { vx: 0, vy: 0, speed: 0 };

    let totalDx = 0;
    let totalDy = 0;
    let count = 0;

    for (let i = 1; i < this.buffer.length; i++) {
      const dt = (this.timestamps[i] - this.timestamps[i - 1]) / 1000; // seconds
      if (dt <= 0) continue;

      const prev = this.buffer[i - 1][landmarkIndex];
      const curr = this.buffer[i][landmarkIndex];

      totalDx += (curr.x - prev.x) / dt;
      totalDy += (curr.y - prev.y) / dt;
      count++;
    }

    if (count === 0) return { vx: 0, vy: 0, speed: 0 };

    const vx = totalDx / count;
    const vy = totalDy / count;
    return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  }

  /**
   * Detect horizontal wave motion (for "Bye" gesture).
   * Looks for oscillation in the x-axis of the wrist/fingertips.
   */
  detectWave() {
    if (this.buffer.length < 10) return { detected: false, amplitude: 0 };

    // Track wrist x-position
    const positions = this.buffer.map(frame => frame[0].x); // wrist
    return this._detectOscillation(positions, {
      minAmplitude: 0.03,
      minDirectionChanges: 2,
    });
  }

  /**
   * Detect vertical nod motion (for "Yes" / thumbs-up with nod).
   * Looks for vertical oscillation of the hand.
   */
  detectNod() {
    if (this.buffer.length < 8) return { detected: false, amplitude: 0 };

    const positions = this.buffer.map(frame => frame[0].y); // wrist y
    return this._detectOscillation(positions, {
      minAmplitude: 0.02,
      minDirectionChanges: 1,
    });
  }

  /**
   * Detect horizontal wag motion (for "No" gesture).
   * Looks for horizontal oscillation of index/middle fingertips.
   */
  detectWag() {
    if (this.buffer.length < 10) return { detected: false, amplitude: 0 };

    // Average x-position of index and middle fingertips
    const positions = this.buffer.map(frame =>
      (frame[8].x + frame[12].x) / 2 // index tip + middle tip
    );
    return this._detectOscillation(positions, {
      minAmplitude: 0.025,
      minDirectionChanges: 2,
    });
  }

  /**
   * Generic oscillation detection in a 1D signal.
   */
  _detectOscillation(positions, { minAmplitude, minDirectionChanges }) {
    if (positions.length < 5) return { detected: false, amplitude: 0 };

    // Compute direction changes and amplitude
    let directionChanges = 0;
    let lastDirection = 0;
    let minVal = positions[0];
    let maxVal = positions[0];

    for (let i = 1; i < positions.length; i++) {
      const diff = positions[i] - positions[i - 1];
      const direction = diff > 0.002 ? 1 : diff < -0.002 ? -1 : 0;

      if (direction !== 0 && direction !== lastDirection && lastDirection !== 0) {
        directionChanges++;
      }
      if (direction !== 0) lastDirection = direction;

      minVal = Math.min(minVal, positions[i]);
      maxVal = Math.max(maxVal, positions[i]);
    }

    const amplitude = maxVal - minVal;

    return {
      detected: directionChanges >= minDirectionChanges && amplitude >= minAmplitude,
      amplitude,
      directionChanges,
    };
  }

  /**
   * Clear the motion buffer.
   */
  clear() {
    this.buffer = [];
    this.timestamps = [];
  }

  /**
   * Get the number of frames in the buffer.
   */
  get frameCount() {
    return this.buffer.length;
  }
}
