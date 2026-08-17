/**
 * Local onboarding progress for event organizers.
 * Keys are per Firebase uid so multi-account browsers stay correct.
 */

const storageKey = (uid) => `powerauction_onboarding_${uid || 'anon'}`;

const defaultState = () => ({
  completed: false,
  dismissed: false,
  eventId: null,
  step: 'welcome',
  categoryMode: null, // 'open' | 'custom'
  updatedAt: null,
});

export function getOnboardingState(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function setOnboardingState(uid, patch) {
  const next = {
    ...getOnboardingState(uid),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export function markOnboardingComplete(uid, eventId = null) {
  return setOnboardingState(uid, {
    completed: true,
    dismissed: false,
    eventId: eventId || getOnboardingState(uid).eventId,
    step: 'done',
  });
}

export function markOnboardingDismissed(uid) {
  return setOnboardingState(uid, { dismissed: true });
}

export function resetOnboarding(uid) {
  try {
    localStorage.removeItem(storageKey(uid));
  } catch {
    // ignore
  }
  return defaultState();
}

/**
 * Should we force the guided setup flow?
 * Event organizers with zero auctions who have not completed or dismissed.
 * Super admins are never forced.
 */
export function shouldForceOnboarding({
  isEventOrganizer,
  isSuperAdmin,
  eventCount,
  uid,
}) {
  if (isSuperAdmin) return false;
  if (!isEventOrganizer) return false;
  if (eventCount > 0) return false;
  const state = getOnboardingState(uid);
  if (state.completed || state.dismissed) return false;
  return true;
}

/**
 * Soft prompt: organizer has an auction but setup looks incomplete.
 */
export function shouldShowSetupBanner({
  isEventOrganizer,
  isSuperAdmin,
  eventCount,
  hasCategories,
  hasTeams,
  uid,
}) {
  if (isSuperAdmin) return false;
  if (!isEventOrganizer) return false;
  const state = getOnboardingState(uid);
  if (state.completed || state.dismissed) return false;
  if (eventCount === 0) return true;
  if (hasCategories === false || hasTeams === false) return true;
  return false;
}
