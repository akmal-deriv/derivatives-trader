import { getAutomationStopMessage, parseStopReasonCode } from '../automation-stop-message';

describe('parseStopReasonCode', () => {
    it('splits the compound Code(Subcode) format', () => {
        expect(parseStopReasonCode('InvalidtoBuy(PayoutLimits)')).toEqual({
            code: 'InvalidtoBuy',
            subcode: 'PayoutLimits',
        });
    });

    it('returns a plain code untouched', () => {
        expect(parseStopReasonCode('InsufficientBalance')).toEqual({ code: 'InsufficientBalance' });
    });

    it('handles empty/undefined input safely', () => {
        expect(parseStopReasonCode('')).toEqual({ code: '' });
        expect(parseStopReasonCode(undefined)).toEqual({ code: '' });
    });
});

describe('getAutomationStopMessage', () => {
    it('maps a parameterised InvalidtoBuy subcode (PayoutLimits) to a clean, gap-free message', () => {
        const message = getAutomationStopMessage('InvalidtoBuy(PayoutLimits)');
        expect(message).toBe('The contract payout is outside the allowed limits. Automation stopped.');
        expect(message).not.toMatch(/{{param/);
        expect(message).not.toMatch(/ {2}/); // no empty-param gaps
    });

    it('groups stake-limit InvalidtoBuy subcodes onto one message', () => {
        expect(getAutomationStopMessage('InvalidtoBuy(StakeLimits)')).toBe(
            'The stake is outside the allowed limits. Automation stopped.'
        );
    });

    it('maps every parameterised InvalidtoBuy subcode without leaving param gaps', () => {
        const multiplier = getAutomationStopMessage('InvalidtoBuy(MultiplierOutOfRange)');
        expect(multiplier).toBe('The multiplier is outside the acceptable range. Automation stopped.');
        expect(multiplier).not.toMatch(/{{param/);
        expect(multiplier).not.toMatch(/ {2}/);
    });

    it('maps a subcode the shared mapper does not know (CannotProcessContract)', () => {
        expect(getAutomationStopMessage('InvalidtoBuy(CannotProcessContract)')).toBe(
            'This contract could not be processed. Automation stopped.'
        );
    });

    it('defers param-free InvalidtoBuy subcodes to the shared mapper', () => {
        // `InvalidStake` is param-free, so the shared mapper handles it once the
        // subcode is extracted from the compound code.
        expect(getAutomationStopMessage('InvalidtoBuy(InvalidStake)')).toBe(
            'Invalid stake/payout. Automation stopped.'
        );
    });

    it('defers top-level codes to the shared mapper unchanged', () => {
        expect(getAutomationStopMessage('InsufficientBalance')).toBe(
            'Your account balance is insufficient to buy this contract. Automation stopped.'
        );
    });

    it('uses a clean reason for codes the mapper cannot map', () => {
        expect(getAutomationStopMessage('SomethingWeNeverMapped')).toBe(
            'An unexpected error occurred. Automation stopped.'
        );
    });

    it('handles empty/undefined input safely', () => {
        expect(getAutomationStopMessage('')).toBe('An unexpected error occurred. Automation stopped.');
        expect(getAutomationStopMessage(undefined)).toBe('An unexpected error occurred. Automation stopped.');
    });
});
