export const RISK_DISCLOSURE_RESIDENCE = 'es' as const;

export const RISK_DISCLOSURE_ACCEPTED_KEY = 'risk_disclosure_accepted';

export const normaliseDisclaimerText = (value: string): string => value.trim().replace(/\s+/g, ' ');
