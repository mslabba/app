import { useEffect, useState } from 'react';

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
