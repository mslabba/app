// Short, readable registration reference derived deterministically
// from the registration UUID: the same UUID always gives the same
// reference, so it survives refresh/restore with no backend change.
// The full UUID never appears on screen — this is what the player
// reads out to the organizer. Shared by the player ticket and the
// admin Registrations page so the two can never drift apart.
export const shortReference = (registrationId) => {
  const hex = String(registrationId || '').replace(/[^0-9a-fA-F]/g, '');
  if (hex.length < 6) return '—';
  return `PA-${hex.slice(0, 6).toUpperCase()}`;
};
