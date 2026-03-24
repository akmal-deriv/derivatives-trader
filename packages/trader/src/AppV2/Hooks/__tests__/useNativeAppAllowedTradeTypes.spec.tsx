import { useRemoteConfig, useMobileBridge } from '@deriv/api';
import { renderHook } from '@testing-library/react-hooks';

import useNativeAppAllowedTradeTypes from '../useNativeAppAllowedTradeTypes';

jest.mock('@deriv/api', () => ({
    useRemoteConfig: jest.fn(() => ({
        data: {
            native_app_allowed_trade_types: {
                ACCUMULATORS: 'Accumulators',
                VANILLAS: 'Vanillas',
                TURBOS: 'Turbos',
                MULTIPLIERS: 'Multipliers',
            },
        },
        isLoading: false,
    })),
    useMobileBridge: jest.fn(() => ({
        isBridgeAvailable: false,
    })),
}));

describe('useNativeAppAllowedTradeTypes', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset to default mocks
        (useMobileBridge as jest.Mock).mockReturnValue({
            isBridgeAvailable: false,
        });

        (useRemoteConfig as jest.Mock).mockReturnValue({
            data: {
                native_app_allowed_trade_types: {
                    ACCUMULATORS: 'Accumulators',
                    VANILLAS: 'Vanillas',
                    TURBOS: 'Turbos',
                    MULTIPLIERS: 'Multipliers',
                },
            },
            isLoading: false,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Web App (Bridge Not Available)', () => {
        it('should return undefined when bridge is not available', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(result.current).toBeUndefined();
        });
    });

    describe('Native Mobile App (Bridge Available)', () => {
        it('should return array of allowed trade types when bridge is available and config is valid', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {
                    native_app_allowed_trade_types: {
                        ACCUMULATORS: 'Accumulators',
                        MULTIPLIERS: 'Multipliers',
                    },
                },
                isLoading: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(result.current).toEqual(['Accumulators', 'Multipliers']);
        });

        it('should return all configured trade types in correct format', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {
                    native_app_allowed_trade_types: {
                        ACCUMULATORS: 'Accumulators',
                        VANILLAS: 'Vanillas',
                        TURBOS: 'Turbos',
                        MULTIPLIERS: 'Multipliers',
                    },
                },
                isLoading: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(result.current).toEqual(['Accumulators', 'Vanillas', 'Turbos', 'Multipliers']);
            expect(Array.isArray(result.current)).toBe(true);
        });

        it('should call useRemoteConfig with true parameter', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            renderHook(() => useNativeAppAllowedTradeTypes());

            expect(useRemoteConfig).toHaveBeenCalledWith(true);
        });
    });

    describe('Edge Cases - Fail-Safe Behavior', () => {
        it('should return empty array when native_app_allowed_trade_types is missing (fail-safe)', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {},
                isLoading: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(consoleWarnSpy).toHaveBeenCalledWith('native_app_allowed_trade_types missing from remote config');
            expect(result.current).toEqual([]);

            consoleWarnSpy.mockRestore();
        });

        it('should return empty array when remoteConfigData is null (fail-safe)', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: null,
                isLoading: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(consoleWarnSpy).toHaveBeenCalledWith('native_app_allowed_trade_types missing from remote config');
            expect(result.current).toEqual([]);

            consoleWarnSpy.mockRestore();
        });

        it('should return empty array when native_app_allowed_trade_types is empty object', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {
                    native_app_allowed_trade_types: {},
                },
                isLoading: false,
            });

            const { result } = renderHook(() => useNativeAppAllowedTradeTypes());

            // Empty object means no trade types are allowed
            expect(result.current).toEqual([]);
        });
    });

    describe('Memoization', () => {
        it('should memoize result when dependencies do not change', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            const mockConfig = {
                data: {
                    native_app_allowed_trade_types: {
                        ACCUMULATORS: 'Accumulators',
                        MULTIPLIERS: 'Multipliers',
                    },
                },
            };

            (useRemoteConfig as jest.Mock).mockReturnValue(mockConfig);

            const { result, rerender } = renderHook(() => useNativeAppAllowedTradeTypes());

            const firstResult = result.current;
            rerender();
            const secondResult = result.current;

            // Should return the same reference if dependencies haven't changed
            expect(firstResult).toBe(secondResult);
        });

        it('should recompute when remote config data changes', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });

            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {
                    native_app_allowed_trade_types: {
                        ACCUMULATORS: 'Accumulators',
                    },
                },
            });

            const { result, rerender } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(result.current).toEqual(['Accumulators']);

            // Update mock to return different config
            (useRemoteConfig as jest.Mock).mockReturnValue({
                data: {
                    native_app_allowed_trade_types: {
                        MULTIPLIERS: 'Multipliers',
                    },
                },
                isLoading: false,
            });

            rerender();

            expect(result.current).toEqual(['Multipliers']);
        });

        it('should recompute when bridge availability changes', () => {
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: false,
            });

            const { result, rerender } = renderHook(() => useNativeAppAllowedTradeTypes());

            expect(result.current).toBeUndefined();

            // Change bridge availability
            (useMobileBridge as jest.Mock).mockReturnValue({
                isBridgeAvailable: true,
            });
            rerender();

            expect(result.current).toEqual(['Accumulators', 'Vanillas', 'Turbos', 'Multipliers']);
        });
    });
});
