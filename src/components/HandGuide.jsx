/**
 * HandGuide.jsx — Animated hand silhouette guide overlay
 * 
 * Shown when no hand is detected in the camera feed.
 * Guides the user to position their hand correctly.
 */

import './HandGuide.css';

export default function HandGuide({ visible }) {
  if (!visible) return null;

  return (
    <div className="hand-guide" id="hand-guide">
      <div className="hand-guide__silhouette">
        <svg viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Simplified hand silhouette */}
          <path
            d="M100 20 C100 20, 85 10, 80 40 L80 100
               M100 20 C100 20, 100 5, 100 40 L100 100
               M100 20 C100 20, 115 10, 120 40 L120 100
               M120 100 C130 30, 145 40, 140 100
               M80 100 C70 50, 55 60, 60 100
               M60 100 L60 160 C60 200, 80 230, 100 240
               C120 230, 140 200, 140 160 L140 100"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          {/* Joint dots */}
          {[
            [100, 20], [80, 40], [80, 70], [80, 100],
            [100, 40], [100, 70], [100, 100],
            [120, 40], [120, 70], [120, 100],
            [140, 50], [140, 75], [140, 100],
            [60, 60], [60, 80], [60, 100],
            [100, 160], [100, 200], [100, 240],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="currentColor" opacity="0.3" />
          ))}
        </svg>
      </div>
      <p className="hand-guide__text">
        Position your hand in the frame
      </p>
      <p className="hand-guide__subtext">
        Keep your hand visible and well-lit
      </p>
    </div>
  );
}
