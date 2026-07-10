import { act, renderHook } from '@testing-library/react';

import useChartMarketSelectorOpen from '../useChartMarketSelectorOpen';

describe('useChartMarketSelectorOpen', () => {
    let chart_title: HTMLDivElement;

    beforeEach(() => {
        jest.useFakeTimers();
        chart_title = document.createElement('div');
        chart_title.className = 'cq-chart-title';
        document.body.appendChild(chart_title);
    });

    afterEach(() => {
        jest.useRealTimers();
        chart_title.remove();
    });

    it('returns false when disabled and never observes the DOM', () => {
        const { result } = renderHook(() => useChartMarketSelectorOpen(false));

        expect(result.current).toBe(false);
    });

    it('reports open while the chart-title is active, then closed once the class is removed', async () => {
        chart_title.classList.add('stxMenuActive');

        const { result } = renderHook(() => useChartMarketSelectorOpen(true));

        // Defaults to true (enabled) before the poll attaches the observer.
        expect(result.current).toBe(true);

        // Poll finds the element and confirms it is open.
        await act(async () => {
            jest.advanceTimersByTime(100);
        });
        expect(result.current).toBe(true);

        // The user closes the selector -> SmartCharts drops the active class.
        await act(async () => {
            chart_title.classList.remove('stxMenuActive');
            await Promise.resolve();
        });
        expect(result.current).toBe(false);
    });

    it('stops deferring if the selector never registers as open (safety fallback)', async () => {
        // Element is present but never receives the active class.
        const { result } = renderHook(() => useChartMarketSelectorOpen(true));

        expect(result.current).toBe(true);

        await act(async () => {
            jest.advanceTimersByTime(4000);
        });
        expect(result.current).toBe(false);
    });

    it('does not re-open after the first open→close (one-shot)', async () => {
        chart_title.classList.add('stxMenuActive');
        const { result } = renderHook(() => useChartMarketSelectorOpen(true));

        await act(async () => {
            jest.advanceTimersByTime(100);
        });
        await act(async () => {
            chart_title.classList.remove('stxMenuActive');
            await Promise.resolve();
        });
        expect(result.current).toBe(false);

        // A later manual re-open must not re-hide onboarding.
        await act(async () => {
            chart_title.classList.add('stxMenuActive');
            await Promise.resolve();
        });
        expect(result.current).toBe(false);
    });

    it('does not re-open after the fail-safe deadline fires', async () => {
        const { result } = renderHook(() => useChartMarketSelectorOpen(true));

        await act(async () => {
            jest.advanceTimersByTime(4000);
        });
        expect(result.current).toBe(false);

        // Selector opens late (after the deadline gave up) — must stay unblocked.
        await act(async () => {
            chart_title.classList.add('stxMenuActive');
            await Promise.resolve();
        });
        expect(result.current).toBe(false);
    });
});
