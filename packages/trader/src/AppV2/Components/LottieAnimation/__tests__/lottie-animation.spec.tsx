import React from 'react';

import { render, screen } from '@testing-library/react';

import LottieAnimation from '../lottie-animation';

const LOTTIE = 'DotLottieReact';

jest.mock('@lottiefiles/dotlottie-react', () => ({
    DotLottieReact: jest.fn(() => <div>{LOTTIE}</div>),
}));

type TResizeCallback = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;

describe('LottieAnimation', () => {
    let resize_callback: TResizeCallback | null = null;
    const observe = jest.fn();
    const disconnect = jest.fn();

    beforeEach(() => {
        resize_callback = null;
        observe.mockClear();
        disconnect.mockClear();
        globalThis.ResizeObserver = jest.fn().mockImplementation((cb: TResizeCallback) => {
            resize_callback = cb;
            return { observe, unobserve: jest.fn(), disconnect };
        }) as unknown as typeof ResizeObserver;
    });

    it('does not mount the animation until a non-zero size is observed', () => {
        render(<LottieAnimation autoplay loop src='animation.lottie' />);

        // Starts hidden so DotLottieReact never draws at zero size before the observer reports.
        expect(screen.queryByText(LOTTIE)).not.toBeInTheDocument();
        expect(observe).toHaveBeenCalledTimes(1);
    });

    it('mounts the animation once the container is observed with a non-zero size', () => {
        render(<LottieAnimation autoplay loop src='animation.lottie' />);

        React.act(() => resize_callback?.([{ contentRect: { width: 100, height: 100 } }]));

        expect(screen.getByText(LOTTIE)).toBeInTheDocument();
    });

    it('keeps the animation unmounted when the container is observed with a zero size', () => {
        render(<LottieAnimation autoplay loop src='animation.lottie' />);

        React.act(() => resize_callback?.([{ contentRect: { width: 0, height: 0 } }]));

        expect(screen.queryByText(LOTTIE)).not.toBeInTheDocument();
    });

    it('renders the animation unconditionally when ResizeObserver is unavailable', () => {
        const original = globalThis.ResizeObserver;
        // @ts-expect-error intentionally removing the global for this scenario
        delete globalThis.ResizeObserver;

        render(<LottieAnimation autoplay loop src='animation.lottie' />);

        expect(screen.getByText(LOTTIE)).toBeInTheDocument();

        globalThis.ResizeObserver = original;
    });
});
