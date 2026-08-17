/**
 * Public live broadcast API + polling hook.
 * Phase 1: HTTP polling. Structure allows swapping to SSE later.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export async function fetchLivePlayer(token) {
  const { data } = await axios.get(`${API}/public/live/${encodeURIComponent(token)}/player`, {
    headers: { Accept: 'application/json' },
    timeout: 12000,
  });
  return data;
}

export async function fetchLiveTeams(token) {
  const { data } = await axios.get(`${API}/public/live/${encodeURIComponent(token)}/teams`, {
    headers: { Accept: 'application/json' },
    timeout: 12000,
  });
  return data;
}

/**
 * @param {string} token
 * @param {'player'|'teams'} board
 * @param {number} intervalMs
 */
export function usePublicLiveBoard(token, board, intervalMs = 2500) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (!token || inflight.current) return;
    inflight.current = true;
    try {
      const next = board === 'teams' ? await fetchLiveTeams(token) : await fetchLivePlayer(token);
      if (!mounted.current) return;
      setData(next);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mounted.current) return;
      const status = err.response?.status;
      let msg = 'Unable to load live board';
      if (status === 403) msg = 'Invalid or expired broadcast link';
      else if (status === 404) msg = 'Event not found';
      else if (err.code === 'ECONNABORTED') msg = 'Request timed out';
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      inflight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [token, board]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    load();

    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      load();
    }, intervalMs);

    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mounted.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load, intervalMs]);

  return { data, error, loading, lastUpdated, refresh: load };
}

export function formatInr(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
