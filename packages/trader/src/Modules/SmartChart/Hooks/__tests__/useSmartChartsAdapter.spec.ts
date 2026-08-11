import { act, renderHook, waitFor } from '@testing-library/react';

import { useSmartChartsAdapter } from '../useSmartChartsAdapter';

// Mock the adapter module
const mockGetQuotes = jest.fn();
const mockSubscribeQuotes = jest.fn();
const mockUnsubscribeQuotes = jest.fn();
const mockGetChartData = jest.fn();

jest.mock('../../Adapters', () => ({
    createSmartChartsChampionAdapter: jest.fn(() => ({
        getQuotes: mockGetQuotes,
        subscribeQuotes: mockSubscribeQuotes,
        unsubscribeQuotes: mockUnsubscribeQuotes,
        getChartData: mockGetChartData,
        transport: {
            unsubscribeAll: jest.fn(),
        },
    })),
    transformations: {
        toActiveSymbols: jest.fn(data => data),
    },
    TGetQuotes: {},
    TGranularity: {},
    TSubscribeQuotes: {},
    TUnsubscribeQuotes: {},
}));

jest.mock('../../Adapters/transformers', () => ({
    enrichActiveSymbols: jest.fn(symbols => symbols),
}));

jest.mock('mobx', () => ({
    toJS: jest.fn(data => data),
}));

// Default activeSymbols to pass to the hook so fetchChartData fires
const mockActiveSymbols = [{ symbol: 'EURUSD', display_name: 'EUR/USD' }];

describe('useSmartChartsAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for getChartData
        mockGetChartData.mockResolvedValue({
            rawData: { activeSymbols: [], tradingTimes: {} },
            activeSymbols: [],
            tradingTimes: {},
        });
    });

    describe('early-sync effect', () => {
        it('should populate chartData with activeSymbols before getChartData resolves', async () => {
            const symbols = [{ symbol: 'R_100', display_name: 'Volatility 100 Index' }];
            const { transformations: mockTransformations } = jest.requireMock('../../Adapters');

            // getChartData resolves after a delay — early-sync should fire before it
            mockGetChartData.mockImplementation(
                () =>
                    new Promise(resolve =>
                        setTimeout(
                            () =>
                                resolve({
                                    rawData: { activeSymbols: [], tradingTimes: {} },
                                    activeSymbols: symbols,
                                    tradingTimes: { R_100: { isOpen: true, openTime: '00:00', closeTime: '23:59' } },
                                }),
                            200
                        )
                    )
            );

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: symbols }));

            // Before getChartData resolves, chartData should already have activeSymbols via early-sync
            await waitFor(() => {
                expect(result.current.chartData.activeSymbols).not.toHaveLength(0);
            });
            expect(mockTransformations.toActiveSymbols).toHaveBeenCalledWith(symbols);
            // Fallback trading-times seed (never {}): one entry per active symbol so
            // SmartCharts' unguarded per-symbol reads can't throw before the real data lands
            expect(result.current.chartData.tradingTimes).toEqual({
                R_100: { isOpen: false, openTime: '--', closeTime: '--' },
            });
        });
    });

    describe('trading-times fallback map', () => {
        it('seeds one entry per active symbol on mount, keyed by underlying_symbol || symbol', () => {
            const symbols = [
                { underlying_symbol: 'R_100', display_name: 'Volatility 100 Index', exchange_is_open: 1 },
                { symbol: 'frxEURUSD', display_name: 'EUR/USD', exchange_is_open: 0 },
            ];

            // Delay getChartData so the initial seed is observable
            mockGetChartData.mockImplementation(() => new Promise(() => {}));

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: symbols }));

            expect(result.current.chartData.tradingTimes).toEqual({
                R_100: { isOpen: true, openTime: '--', closeTime: '--' },
                frxEURUSD: { isOpen: false, openTime: '--', closeTime: '--' },
            });
        });

        it('leaves tradingTimes undefined on mount for replay chart (empty activeSymbols)', () => {
            mockGetChartData.mockImplementation(() => new Promise(() => {}));

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: [] }));

            // Guard behavior: replay chart must stay blocked until real symbol data arrives
            expect(result.current.chartData.tradingTimes).toBeUndefined();
        });

        it('backfills symbols missing from the trading_times response on success', async () => {
            const symbols = [
                { symbol: 'R_100', display_name: 'Volatility 100 Index', exchange_is_open: 1 },
                { symbol: 'frxEURUSD', display_name: 'EUR/USD', exchange_is_open: 1 },
            ];

            mockGetChartData.mockResolvedValue({
                rawData: { activeSymbols: symbols, tradingTimes: {} },
                activeSymbols: symbols,
                // Response is missing frxEURUSD
                tradingTimes: { R_100: { isOpen: true, openTime: '00:00', closeTime: '23:59' } },
            });

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: symbols }));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.chartData.tradingTimes).toEqual({
                // Real entry wins
                R_100: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
                // Missing symbol keeps a fallback entry
                frxEURUSD: { isOpen: true, openTime: '--', closeTime: '--' },
            });
        });

        it('retains fallback entries when the trading_times fetch fails (adapter settles on {})', async () => {
            const symbols = [{ symbol: 'R_100', display_name: 'Volatility 100 Index', exchange_is_open: 1 }];

            // The adapter swallows WS errors and resolves with an empty map
            mockGetChartData.mockResolvedValue({
                rawData: { activeSymbols: symbols, tradingTimes: {} },
                activeSymbols: symbols,
                tradingTimes: {},
            });

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: symbols }));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.chartData.tradingTimes).toEqual({
                R_100: { isOpen: true, openTime: '--', closeTime: '--' },
            });
        });

        it('retries the fetch once when trading_times comes back empty', async () => {
            jest.useFakeTimers();
            try {
                const symbols = [{ symbol: 'R_100', display_name: 'Volatility 100 Index', exchange_is_open: 1 }];

                mockGetChartData.mockResolvedValue({
                    rawData: { activeSymbols: symbols, tradingTimes: {} },
                    activeSymbols: symbols,
                    tradingTimes: {},
                });

                const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: symbols }));

                // Initial fetch completes (isLoading flips false only after the async
                // continuation that schedules the retry has run)
                await waitFor(() => expect(result.current.isLoading).toBe(false));
                expect(mockGetChartData).toHaveBeenCalledTimes(1);

                // Retry fires after the delay
                await act(async () => {
                    jest.advanceTimersByTime(10000);
                });
                await waitFor(() => expect(mockGetChartData).toHaveBeenCalledTimes(2));

                // Only one retry — advancing further fires nothing new
                await act(async () => {
                    jest.advanceTimersByTime(60000);
                });
                expect(mockGetChartData).toHaveBeenCalledTimes(2);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe('shouldUseCandlesOverride', () => {
        it('should return shouldUseCandlesOverride as false by default', async () => {
            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: mockActiveSymbols }));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.shouldUseCandlesOverride).toBe(false);
        });

        it('should NOT override to candles when tick data covers minStartEpoch', async () => {
            const minStartEpoch = 1609459200; // Target start epoch

            // Mock getQuotes to return tick data that covers minStartEpoch
            mockGetQuotes.mockResolvedValue({
                quotes: [
                    { Date: '1609459100', Close: 1.1234 }, // Earlier than minStartEpoch
                    { Date: '1609459200', Close: 1.1235 },
                    { Date: '1609459300', Close: 1.1236 },
                ],
            });

            const { result } = renderHook(() =>
                useSmartChartsAdapter({
                    activeSymbols: mockActiveSymbols,
                    minStartEpoch,
                })
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Call getQuotes with ticks (granularity 0)
            await act(async () => {
                await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 0,
                    count: 100,
                });
            });

            // Should NOT switch to candles since tick data covers minStartEpoch
            expect(result.current.shouldUseCandlesOverride).toBe(false);
            expect(mockGetQuotes).toHaveBeenCalledTimes(1);
        });

        it('should override to candles when tick data does NOT cover minStartEpoch', async () => {
            const minStartEpoch = 1609459000; // Target start epoch

            // First call returns tick data that doesn't cover minStartEpoch
            mockGetQuotes
                .mockResolvedValueOnce({
                    quotes: [
                        { Date: '1609459200', Close: 1.1234 }, // Later than minStartEpoch
                        { Date: '1609459300', Close: 1.1235 },
                    ],
                })
                // Second call returns candle data
                .mockResolvedValueOnce({
                    quotes: [
                        { Date: '1609458900', Open: 1.12, High: 1.13, Low: 1.11, Close: 1.125 },
                        { Date: '1609459000', Open: 1.125, High: 1.14, Low: 1.12, Close: 1.135 },
                    ],
                });

            const { result } = renderHook(() =>
                useSmartChartsAdapter({
                    activeSymbols: mockActiveSymbols,
                    minStartEpoch,
                })
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Call getQuotes with ticks (granularity 0)
            await act(async () => {
                await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 0,
                    count: 100,
                });
            });

            // Should switch to candles since tick data doesn't cover minStartEpoch
            expect(result.current.shouldUseCandlesOverride).toBe(true);
            // getQuotes should be called twice: once for ticks, once for candles
            expect(mockGetQuotes).toHaveBeenCalledTimes(2);
            // Second call should use candle granularity (60)
            expect(mockGetQuotes).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    granularity: 60,
                })
            );
        });

        it('should NOT override when quotes array is empty', async () => {
            const minStartEpoch = 1609459000;

            mockGetQuotes.mockResolvedValue({
                quotes: [],
            });

            const { result } = renderHook(() =>
                useSmartChartsAdapter({
                    activeSymbols: mockActiveSymbols,
                    minStartEpoch,
                })
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 0,
                    count: 100,
                });
            });

            // Should NOT switch to candles when quotes is empty
            expect(result.current.shouldUseCandlesOverride).toBe(false);
            expect(mockGetQuotes).toHaveBeenCalledTimes(1);
        });

        it('should NOT override when minStartEpoch is undefined', async () => {
            mockGetQuotes.mockResolvedValue({
                quotes: [
                    { Date: '1609459200', Close: 1.1234 },
                    { Date: '1609459300', Close: 1.1235 },
                ],
            });

            const { result } = renderHook(() =>
                useSmartChartsAdapter({
                    activeSymbols: mockActiveSymbols,
                    // minStartEpoch is NOT provided
                })
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 0,
                    count: 100,
                });
            });

            // Should NOT switch to candles when minStartEpoch is undefined
            expect(result.current.shouldUseCandlesOverride).toBe(false);
            expect(mockGetQuotes).toHaveBeenCalledTimes(1);
        });

        it('should NOT override when granularity is already non-zero (candles)', async () => {
            const minStartEpoch = 1609459000;

            mockGetQuotes.mockResolvedValue({
                quotes: [{ Date: '1609459200', Open: 1.12, High: 1.13, Low: 1.11, Close: 1.125 }],
            });

            const { result } = renderHook(() =>
                useSmartChartsAdapter({
                    activeSymbols: mockActiveSymbols,
                    minStartEpoch,
                })
            );

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Call getQuotes with candles (granularity 60)
            await act(async () => {
                await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 60,
                    count: 100,
                });
            });

            // Should NOT switch since already requesting candles
            expect(result.current.shouldUseCandlesOverride).toBe(false);
            expect(mockGetQuotes).toHaveBeenCalledTimes(1);
        });
    });

    describe('getQuotes return format', () => {
        it('should return history format for ticks (granularity 0)', async () => {
            mockGetQuotes.mockResolvedValue({
                quotes: [
                    { Date: '1609459200', Close: 1.1234 },
                    { Date: '1609459201', Close: 1.1235 },
                ],
            });

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: mockActiveSymbols }));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            let response;
            await act(async () => {
                response = await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 0,
                    count: 100,
                });
            });

            expect(response).toEqual({
                history: {
                    prices: [1.1234, 1.1235],
                    times: [1609459200, 1609459201],
                },
            });
        });

        it('should return candles format for non-zero granularity', async () => {
            mockGetQuotes.mockResolvedValue({
                quotes: [{ Date: '1609459200', Open: 1.12, High: 1.13, Low: 1.11, Close: 1.125 }],
            });

            const { result } = renderHook(() => useSmartChartsAdapter({ activeSymbols: mockActiveSymbols }));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            let response;
            await act(async () => {
                response = await result.current.getQuotes({
                    symbol: 'EURUSD',
                    granularity: 60,
                    count: 100,
                });
            });

            expect(response).toEqual({
                candles: [
                    {
                        open: 1.12,
                        high: 1.13,
                        low: 1.11,
                        close: 1.125,
                        epoch: 1609459200,
                    },
                ],
            });
        });
    });
});
