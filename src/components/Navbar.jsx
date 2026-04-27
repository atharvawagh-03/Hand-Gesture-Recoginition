/**
 * Navbar.jsx — Top navigation bar
 */

import './Navbar.css';
import useSettingsStore from '../store/useSettingsStore.js';

export default function Navbar() {
  const ttsEnabled = useSettingsStore(s => s.ttsEnabled);
  const mirrorMode = useSettingsStore(s => s.mirrorMode);
  const toggleTTS = useSettingsStore(s => s.toggleTTS);
  const toggleMirror = useSettingsStore(s => s.toggleMirror);
  const openSettings = useSettingsStore(s => s.openSettings);
  const resetOnboarding = useSettingsStore(s => s.resetOnboarding);

  return (
    <nav className="navbar" id="navbar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div className="navbar__brand">
        <div className="navbar__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </div>
        <div className="navbar__title-group">
          <h1 className="navbar__title">HSRS</h1>
          <span className="navbar__subtitle">Hand Sign Recognition</span>
        </div>
      </div>

      {/* Actions */}
      <div className="navbar__actions">
        {/* Mirror Toggle */}
        <button
          className={`navbar__btn ${mirrorMode ? 'navbar__btn--active' : ''}`}
          onClick={toggleMirror}
          aria-label={`Mirror mode: ${mirrorMode ? 'on' : 'off'}`}
          title="Toggle mirror mode"
          id="btn-mirror"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="3 3" opacity="0.5" />
          </svg>
        </button>

        {/* TTS Toggle */}
        <button
          className={`navbar__btn ${ttsEnabled ? 'navbar__btn--active' : ''}`}
          onClick={toggleTTS}
          aria-label={`Text to speech: ${ttsEnabled ? 'on' : 'off'}`}
          title="Toggle text-to-speech"
          id="btn-tts"
        >
          {ttsEnabled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>

        {/* Help / Onboarding */}
        <button
          className="navbar__btn"
          onClick={resetOnboarding}
          aria-label="Show gesture guide"
          title="Show gesture guide"
          id="btn-help"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Settings */}
        <button
          className="navbar__btn navbar__btn--settings"
          onClick={openSettings}
          aria-label="Open settings"
          title="Settings"
          id="btn-settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
