import { renderHook } from '@testing-library/react';

import useLiveTick from '../useLiveTick';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
let mock_data: { tick?: { quote?: number; epoch?: number; pip_size?: number; symbol?: string } } | undefined;

jest.mock('@deriv/api', () => ({
    useSubscription: () => ({ subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, data: mock_data }),
}));

describe('useLiveTick', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mock_data = undefined;
    });

    it('subscribes to the ticks stream for the symbol', () => {
        renderHook(() => useLiveTick('R_100'));
        expect(mockSubscribe).toHaveBeenCalledWith({ payload: { ticks: 'R_100' } });
    });

    it('returns null until the first tick lands', () => {
        const { result } = renderHook(() => useLiveTick('R_100'));
        expect(result.current).toBeNull();
    });

    it('returns the latest quote for the current symbol', () => {
        mock_data = { tick: { quote: 1234.5, epoch: 111, pip_size: 2, symbol: 'R_100' } };
        const { result } = renderHook(() => useLiveTick('R_100'));
        expect(result.current).toEqual({ quote: 1234.5, epoch: 111, pip_size: 2 });
    });

    it('ignores a stale tick that still belongs to the previous symbol', () => {
        mock_data = { tick: { quote: 999, symbol: 'R_50' } };
        const { result } = renderHook(() => useLiveTick('R_100'));
        expect(result.current).toBeNull();
    });

    it('ignores a tick with no numeric quote', () => {
        mock_data = { tick: { symbol: 'R_100' } };
        const { result } = renderHook(() => useLiveTick('R_100'));
        expect(result.current).toBeNull();
    });

    it('forgets the subscription (unsubscribe) on unmount', () => {
        const { unmount } = renderHook(() => useLiveTick('R_100'));
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('forgets the old subscription and re-subscribes when the symbol changes', () => {
        const { rerender } = renderHook(({ symbol }) => useLiveTick(symbol), { initialProps: { symbol: 'R_100' } });
        expect(mockSubscribe).toHaveBeenCalledTimes(1);
        rerender({ symbol: 'R_50' });
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mockSubscribe).toHaveBeenCalledTimes(2);
        expect(mockSubscribe).toHaveBeenLastCalledWith({ payload: { ticks: 'R_50' } });
    });

    it('does not subscribe without a symbol', () => {
        renderHook(() => useLiveTick(''));
        expect(mockSubscribe).not.toHaveBeenCalled();
    });
});
