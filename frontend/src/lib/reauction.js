import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** Put one unsold player back into the available auction pool. */
export function reauctionPlayer(playerId, token) {
  return axios.post(`${API}/players/${playerId}/make-available`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Put many unsold players back (sequential, small batches). Returns {ok, failed}. */
export async function reauctionPlayers(players, token) {
  let ok = 0;
  const failed = [];
  for (let i = 0; i < players.length; i += 5) {
    const batch = players.slice(i, i + 5);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(batch.map((p) => reauctionPlayer(p.id, token)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') ok += 1;
      else failed.push(batch[j]);
    });
  }
  return { ok, failed };
}
