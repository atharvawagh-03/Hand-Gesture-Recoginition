/**
 * OnboardingOverlay.jsx — First-launch gesture reference guide
 */

import './OnboardingOverlay.css';
import gestureConfig from '../config/gestures.json';
import useSettingsStore from '../store/useSettingsStore.js';

// Gesture reference illustrations (SVG-based for instant load)
const gestureIllustrations = {
  hello: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <path d="M40 15 L40 30 M30 18 L30 32 M50 18 L50 32 M55 25 L55 35 M25 25 L25 35 M25 35 L25 55 C25 62 32 68 40 68 C48 68 55 62 55 55 L55 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bye: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <path d="M40 15 L40 30 M30 18 L30 32 M50 18 L50 32 M55 25 L55 35 M25 25 L25 35 M25 35 L25 55 C25 62 32 68 40 68 C48 68 55 62 55 55 L55 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 22 L25 18 M55 18 L62 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M15 28 C18 25 22 28 18 31" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <path d="M65 28 C62 25 58 28 62 31" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    </svg>
  ),
  thank_you: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <path d="M30 25 L30 40 M35 22 L35 40 M40 20 L40 40 M45 22 L45 40 M50 25 L50 40 M30 40 L30 52 C30 58 34 62 40 62 C46 62 50 58 50 52 L50 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 55 L40 70" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" strokeDasharray="3 2" />
      <path d="M36 67 L40 72 L44 67" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  ),
  help_me: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="30" y="30" width="20" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M34 30 L34 26 C34 24 36 22 40 22 C44 22 46 24 46 26 L46 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 22 L40 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" strokeDasharray="3 2" />
      <path d="M36 17 L40 12 L44 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  ),
  yes: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="32" y="35" width="16" height="25" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M36 35 L36 30 C36 28 37 26 40 26 C43 26 44 28 44 30 L44 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 40 L28 36 C26 34 26 30 30 30 C32 30 33 32 32 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 15 L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M26 19 L30 14 L34 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  ),
  no: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <path d="M35 18 L35 38 M45 18 L45 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="30" y="38" width="20" height="22" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 26 L28 22 M52 22 L58 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M20 30 L26 28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M54 28 L60 30" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
};

export default function OnboardingOverlay() {
  const onboardingCompleted = useSettingsStore(s => s.onboardingCompleted);
  const completeOnboarding = useSettingsStore(s => s.completeOnboarding);

  if (onboardingCompleted) return null;

  return (
    <div className="onboarding" id="onboarding-overlay" role="dialog" aria-label="Gesture Guide">
      <div className="onboarding__container">
        <div className="onboarding__header">
          <h2 className="onboarding__title">
            Welcome to <span className="gradient-text">HSRS</span>
          </h2>
          <p className="onboarding__subtitle">
            Learn the 6 supported hand gestures to get started
          </p>
        </div>

        <div className="onboarding__grid">
          {gestureConfig.gestures.map((gesture) => (
            <div
              key={gesture.id}
              className="onboarding__card"
              style={{
                '--card-color': gesture.color,
                '--card-glow': gesture.glowColor,
              }}
            >
              <div className="onboarding__card-illustration" style={{ color: gesture.color }}>
                {gestureIllustrations[gesture.id]}
              </div>
              <div className="onboarding__card-info">
                <span className="onboarding__card-emoji">{gesture.emoji}</span>
                <h3 className="onboarding__card-name" style={{ color: gesture.color }}>
                  {gesture.label}
                </h3>
                <p className="onboarding__card-desc">{gesture.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="onboarding__dismiss"
          onClick={completeOnboarding}
          id="btn-dismiss-onboarding"
        >
          Got It — Start Recognizing
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
