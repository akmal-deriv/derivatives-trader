export const RISK_DISCLOSURE_RESIDENCE = 'es' as const;

export const normaliseDisclaimerText = (value: string): string => value.trim().replace(/\s+/g, ' ');
