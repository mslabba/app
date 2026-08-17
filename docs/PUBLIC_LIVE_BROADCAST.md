# Public Live Auction Broadcast Screens (B10)

OBS / vMix–ready, **no login**, read-only boards.

## Organizer setup

1. Open **Auction settings** for the event.
2. **Live broadcast screens → Generate broadcast links**.
3. Copy:
   - **Player** → browser source 1920×1080  
   - **Teams** → browser source 1920×1080  

Example (local):

```
http://localhost:3004/live/{token}/player
http://localhost:3004/live/{token}/teams
```

Tokens expire in **90 days**. Generate a new link anytime (old tokens remain valid until expiry unless revoked in DB).

## Public API

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/events/{event_id}/generate-broadcast-link` | Organizer JWT |
| GET | `/api/public/live/{token}/player` | Token only |
| GET | `/api/public/live/{token}/teams` | Token only |

Public responses exclude contact numbers, emails, payments, bank details, and admin fields.

## Frontend routes

| Route | Screen |
|-------|--------|
| `/live/:publicToken/player` | Player card + current bid / sold |
| `/live/:publicToken/teams` | Multi-team purse + category needs |

Polling: ~2.5s (player), ~3.5s (teams); paused when the tab is hidden.

## Note on `/display/:eventId`

Legacy display page remains; prefer tokenized `/live/...` for production streaming.
