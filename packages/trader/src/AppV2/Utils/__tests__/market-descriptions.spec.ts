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

    it('returns a description for the Bull Market Index', () => {
        expect(getMarketDescription('RDBULL')).toBe(
            'Positive drift and constant volatility with a tick every 2 seconds'
        );
    });

    it('returns a description for the Bear Market Index', () => {
        expect(getMarketDescription('RDBEAR')).toBe(
            'Negative drift and constant volatility with a tick every 2 seconds'
        );
    });
});
