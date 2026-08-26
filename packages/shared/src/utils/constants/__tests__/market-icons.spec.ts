import { marketIcons } from '../market-icons';

describe('marketIcons', () => {
    it('should map every Crash/Boom symbol, including the newly added 50 and 150N ones', () => {
        const crash_boom_symbols = [
            'crash50',
            'crash150n',
            'crash300n',
            'crash500',
            'crash600',
            'crash900',
            'crash1000',
            'boom50',
            'boom150n',
            'boom300n',
            'boom500',
            'boom600',
            'boom900',
            'boom1000',
        ];

        crash_boom_symbols.forEach(symbol => {
            expect(marketIcons[symbol]).toBeDefined();
        });
    });
    it('should not map an unknown symbol', () => {
        expect(marketIcons.unknown_symbol).toBeUndefined();
    });
});
