import { useEffect, useRef, useState } from "react";

const DURATION_REGEX = /(\d+)\s*(?:-|to)?\s*\d*\s*(minute|min)\b/i;

function parseDurationSeconds(instruction) {
  const match = instruction.match(DURATION_REGEX);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) return null;
  return minutes * 60;
}

function playTimerAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Play a friendly dual-tone chime
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn("Could not play alarm chime:", e);
  }
}

export default function CookMode({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const intervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const step = steps[index];
  const totalDuration = step ? parseDurationSeconds(step.instruction) : null;

  // Request Screen Wake Lock to prevent phone screen from sleeping while cooking
  useEffect(() => {
    let released = false;
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (!released) wakeLockRef.current = lock;
          else lock.release();
        })
        .catch(() => {});
    }
    return () => {
      released = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Stop speech if step changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSecondsLeft(totalDuration);
    setTimerRunning(false);
    clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Timer interval handling
  useEffect(() => {
    if (!timerRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setTimerRunning(false);
          playTimerAlarm();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  function toggleSpeech() {
    if (!("speechSynthesis" in window) || !step) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Step ${index + 1}. ${step.instruction}`);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  if (!step) return null;

  return (
    <div className="cook-mode-overlay" role="dialog" aria-modal="true">
      <div className="cook-mode-card">
        <button type="button" className="cook-mode-close" onClick={onClose} aria-label="Exit cook mode">
          ✕
        </button>

        <div className="cook-mode-header-info">
          <span className="cook-mode-progress">
            Step {index + 1} of {steps.length}
          </span>

          {"speechSynthesis" in window && (
            <button
              type="button"
              className={`tts-button ${isSpeaking ? "speaking" : ""}`}
              onClick={toggleSpeech}
              title="Read instruction out loud"
            >
              {isSpeaking ? "🔊 Pause voice" : "🔊 Read step"}
            </button>
          )}
        </div>

        <p className="cook-mode-instruction">{step.instruction}</p>

        {totalDuration != null && (
          <div className="cook-mode-timer">
            <span className={`timer-display ${secondsLeft === 0 ? "done" : ""}`}>
              {formatTime(secondsLeft ?? totalDuration)}
            </span>
            <div className="timer-buttons">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                disabled={secondsLeft === 0}
              >
                {timerRunning ? "Pause" : secondsLeft === totalDuration || secondsLeft == null ? "Start timer" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(totalDuration);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="cook-mode-nav">
          <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            ← Back
          </button>
          {index < steps.length - 1 ? (
            <button type="button" className="primary" onClick={() => setIndex((i) => i + 1)}>
              Next →
            </button>
          ) : (
            <button type="button" className="primary" onClick={onClose}>
              Done 🎉
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
