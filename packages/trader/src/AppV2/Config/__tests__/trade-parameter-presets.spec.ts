import { getStakePresetOverride, getStakePresets, TRADE_PARAMETER_PRESETS } from '../trade-parameter-presets';

describe('stake presets', () => {
    describe('getStakePresets', () => {
        it('returns the shared presets for a trade type when no symbol is given', () => {
            expect(getStakePresets('turbos')).toEqual(TRADE_PARAMETER_PRESETS.stake.turbos);
            expect(getStakePresets('rise_fall_higher_lower')).toEqual(
                TRADE_PARAMETER_PRESETS.stake.rise_fall_higher_lower
            );
        });

        it('returns the curated override for a symbol that has one', () => {
            expect(getStakePresets('turbos', '1HZ25V')).toEqual([35, 40, 45, 50, 55, 60]);
            expect(getStakePresets('turbos', '1HZ50V')).toEqual([25, 30, 35, 40, 45, 50]);
            expect(getStakePresets('turbos', 'R_75')).toEqual([10, 15, 20, 25, 30, 35]);
        });

        it('falls back to the shared presets for a symbol without an override', () => {
            expect(getStakePresets('turbos', 'R_100')).toEqual(TRADE_PARAMETER_PRESETS.stake.turbos);
        });

        it('does not apply turbos overrides to other trade types on the same symbol', () => {
            expect(getStakePresets('rise_fall_higher_lower', '1HZ25V')).toEqual(
                TRADE_PARAMETER_PRESETS.stake.rise_fall_higher_lower
            );
        });

        it('every curated override starts at or above the shared presets (so it clears the high minimum)', () => {
            expect(getStakePresets('turbos', '1HZ25V')?.[0]).toBeGreaterThan(TRADE_PARAMETER_PRESETS.stake.turbos[0]);
        });
    });

    describe('getStakePresetOverride', () => {
        it('returns the override array for a matching trade type + symbol', () => {
            expect(getStakePresetOverride('turbos', '1HZ25V')).toEqual([35, 40, 45, 50, 55, 60]);
        });

        it('returns undefined without a symbol, for an unknown symbol, or for a trade type with no overrides', () => {
            expect(getStakePresetOverride('turbos')).toBeUndefined();
            expect(getStakePresetOverride('turbos', 'R_100')).toBeUndefined();
            expect(getStakePresetOverride('vanillas', '1HZ25V')).toBeUndefined();
        });
    });
});
