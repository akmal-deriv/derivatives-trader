import React from 'react';
import { observable, runInAction } from 'mobx';

import { mockStore, StoreProvider } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { CONTRACT_LIST } from 'AppV2/Utils/trade-types-utils';

import VideoFragment from '../video-fragment';

const loader = 'dt_skeleton';
const video_fragment = 'DotLottieReact';
const dotlottie_testid = 'dt_dotlottie';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    // Return the requested path unchanged so we can assert the resolved .lottie src.
    getUrlBase: jest.fn((path: string) => path),
}));

// Expose the src prop and forward the ref callback so tests can assert which
// asset (light/dark) is used and can drive the load event.
jest.mock('@lottiefiles/dotlottie-react', () => {
    const ReactActual = jest.requireActual('react');
    return {
        DotLottieReact: ({
            src,
            dotLottieRefCallback,
        }: {
            src: string;
            dotLottieRefCallback?: (el: EventTarget | null) => void;
        }) => {
            const ref = ReactActual.useRef(null);
            ReactActual.useEffect(() => {
                if (ref.current) dotLottieRefCallback?.(ref.current);
            }, [dotLottieRefCallback]);
            return ReactActual.createElement(
                'div',
                { ref, 'data-testid': dotlottie_testid, 'data-src': src },
                video_fragment
            );
        },
    };
});

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: true })),
}));

// LottieAnimation defers mounting the animation until a ResizeObserver reports a
// non-zero size; fire the callback on observe so it mounts in jsdom (which would
// otherwise report 0x0).
globalThis.ResizeObserver = jest.fn().mockImplementation(callback => ({
    observe: jest.fn(() => callback([{ contentRect: { width: 100, height: 100 } }])),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
})) as unknown as typeof ResizeObserver;

// mockStore returns a plain object; make `ui` observable so observer() picks up
// live theme toggles the way it does with the real store.
const createReactiveStore = (is_dark_mode_on = false) => {
    const store = mockStore({});
    store.ui = observable({ ...store.ui, is_dark_mode_on });
    return store;
};

const renderVideoFragment = (contract_type: string, store = createReactiveStore()) => ({
    store,
    ...render(<VideoFragment contract_type={contract_type} />, {
        wrapper: ({ children }) => <StoreProvider store={store}>{children}</StoreProvider>,
    }),
});

describe('VideoFragment', () => {
    beforeEach(() => {
        (useDevice as jest.Mock).mockReturnValue({ isMobile: true });
    });

    it('should render component with loader and video', () => {
        (useDevice as jest.Mock).mockReturnValue({ isMobile: false });
        renderVideoFragment(CONTRACT_LIST.ACCUMULATORS);

        expect(screen.getByTestId(loader)).toBeInTheDocument();
        expect(screen.getByText(video_fragment)).toBeInTheDocument();
    });

    it('should hide the loader once the animation reports it has loaded', () => {
        renderVideoFragment(CONTRACT_LIST.EVEN_ODD);

        expect(screen.getByTestId(loader)).toBeInTheDocument();

        fireEvent.load(screen.getByTestId(dotlottie_testid));

        expect(screen.queryByTestId(loader)).not.toBeInTheDocument();
        expect(screen.getByText(video_fragment)).toBeInTheDocument();
    });

    it('should use the light .lottie asset in light mode', () => {
        renderVideoFragment('rise', createReactiveStore(false));

        expect(screen.getByTestId(dotlottie_testid)).toHaveAttribute('data-src', '/public/videos/rise_mobile.lottie');
    });

    it('should use the dark .lottie asset in dark mode', () => {
        renderVideoFragment('rise', createReactiveStore(true));

        expect(screen.getByTestId(dotlottie_testid)).toHaveAttribute(
            'data-src',
            '/public/videos/rise_mobile_dark.lottie'
        );
    });

    it('should swap the .lottie src live when the theme toggles', () => {
        const { store } = renderVideoFragment('rise', createReactiveStore(false));

        expect(screen.getByTestId(dotlottie_testid)).toHaveAttribute('data-src', '/public/videos/rise_mobile.lottie');

        act(() => {
            runInAction(() => {
                store.ui.is_dark_mode_on = true;
            });
        });

        expect(screen.getByTestId(dotlottie_testid)).toHaveAttribute(
            'data-src',
            '/public/videos/rise_mobile_dark.lottie'
        );
    });
});
