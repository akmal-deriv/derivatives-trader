import { getMarketDescription } from '../market-descriptions';

describe('getMarketDescription', () => {
    it('returns a description for a known symbol', () => {
        expect(getMarketDescription('frxEURUSD')).toBe('Euro vs US Dollar');
    });

    it('returns an empty string for a symbol without an entry', () => {
        expect(getMarketDescription('frxNZDCHF')).toBe('');
    });

    it('returns an empty string for an empty symbol', () => {
        expect(getMarketDescription('')).toBe('');
    });
});
