/**
 * Same-session signal that an intro onboarding (migration / new-user guide) just
 * finished. The completion flags live in localStorage via `useLocalStorageData`,
 * whose state isn't shared across hook instances — so the automation onboarding
 * can't observe the flag flipping in another component without this broadcast
 * (it would otherwise only appear after a refresh).
 */
export const INTRO_ONBOARDING_COMPLETE_EVENT = 'deriv:intro-onboarding-complete';

export const notifyIntroOnboardingComplete = () => window.dispatchEvent(new Event(INTRO_ONBOARDING_COMPLETE_EVENT));
