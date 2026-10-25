import { useEffect, useRef, useState } from 'react';

/**
 * Live countdown from auction timer_started_at + timer_duration.
 * Uses server_time to correct client clock skew when available.
 */
export function useAuctionCountdown(timerStartedAt, timerDuration, serverTime) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!timerStartedAt || !timerDuration) {
      setSecondsLeft(null);
      return undefined;
    }

    const startMs = new Date(timerStartedAt).getTime();
    if (Number.isNaN(startMs)) {
      setSecondsLeft(null);
      return undefined;
    }

    let offset = 0;
    if (serverTime) {
      const serverMs = new Date(serverTime).getTime();
      if (!Number.isNaN(serverMs)) {
        offset = Date.now() - serverMs;
      }
    }

    const tick = () => {
      const now = Date.now() - offset;
      const elapsed = (now - startMs) / 1000;
      const left = Math.max(0, Math.ceil(Number(timerDuration) - elapsed));
      setSecondsLeft(left);
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [timerStartedAt, timerDuration, serverTime]);

  return secondsLeft;
}

export function formatTimer(seconds) {
  if (seconds == null) return '—:—';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Display-board countdown. Prefers the organizer-published `timer`
 * ({running, remaining, updated_at}) when it is newer than timer_started_at,
 * so pause / resume / reset on the control panel are mirrored.
 */
export function useBoardCountdown(state) {
  const timer = state?.timer;
  const startedAt = state?.timer_started_at;
  const tUpdated = timer?.updated_at ? new Date(timer.updated_at).getTime() : NaN;
  const sStarted = startedAt ? new Date(startedAt).getTime() : NaN;
  const hasMeta = Boolean(timer) && !Number.isNaN(tUpdated);
  // Control has published newer state (pause/start/reset) than the last server event
  const useTimer = hasMeta && (Number.isNaN(sStarted) || tUpdated >= sStarted);
  // Control is publishing but hasn't caught up with a new player/bid yet:
  // hold at full duration rather than running an independent countdown.
  const waiting = hasMeta && !useTimer;

  const fallback = useAuctionCountdown(
    hasMeta ? null : startedAt,
    state?.timer_duration || 60,
    null
  );

  // Anchor elapsed time locally to avoid client/server clock skew on TVs
  const anchorRef = useRef({ key: null, base: 0 });
  if (useTimer && anchorRef.current.key !== timer.updated_at) {
    const now = Date.now();
    const drift = now - tUpdated;
    anchorRef.current = { key: timer.updated_at, base: drift >= 0 && drift <= 3000 ? tUpdated : now };
  }
  const anchor = anchorRef.current.base;
  const [left, setLeft] = useState(null);
  const running = useTimer ? !!timer.running : false;
  const remaining = useTimer ? Number(timer.remaining) || 0 : null;
  useEffect(() => {
    if (!useTimer) {
      setLeft(null);
      return undefined;
    }
    if (!running) {
      setLeft(remaining);
      return undefined;
    }
    const tick = () => {
      const elapsed = (Date.now() - anchor) / 1000;
      setLeft(Math.max(0, Math.ceil(remaining - elapsed)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [useTimer, running, remaining, anchor]);

  if (useTimer) return { secondsLeft: left, paused: !running && remaining > 0, hasTimer: true };
  if (waiting) {
    const full = Number(timer.duration) || Number(state?.timer_duration) || 60;
    return { secondsLeft: full, paused: false, hasTimer: true };
  }
  return { secondsLeft: fallback, paused: false, hasTimer: !!startedAt };
}
