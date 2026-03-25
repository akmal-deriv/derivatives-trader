import React from 'react';

import { useDevice } from '@deriv-com/ui';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PresetsOnboardingGuide from '../presets-onboarding-guide';

const guide_key = 'guide_dtrader_v2';
const presets_key = 'presets_onboarding_guide';
const step1_title = 'Intuitive contract switcher';
const step2_title = 'One-Tap durations';
const step3_title = 'Quick stake amounts';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: true, isDesktop: false, isTablet: false })),
}));

jest.mock('@deriv/stores', () => ({
    ...jest.requireActual('@deriv/stores'),
    observer: (component: React.ComponentType) => component,
    useStore: jest.fn(() => ({
        ui: { is_dark_mode_on: false },
    })),
}));

// Mock Image to resolve preloading immediately
let image_on_load_callbacks: (() => void)[] = [];
beforeEach(() => {
    image_on_load_callbacks = [];
    Object.defineProperty(global, 'Image', {
        value: class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            // eslint-disable-next-line no-underscore-dangle
            private _src = '';
            set src(value: string) {
                // eslint-disable-next-line no-underscore-dangle
                this._src = value;
                if (this.onload) image_on_load_callbacks.push(this.onload);
                setTimeout(() => this.onload?.(), 0);
            }
            get src() {
                // eslint-disable-next-line no-underscore-dangle
                return this._src;
            }
        },
        writable: true,
    });
});

const setGuideAsSeen = () => {
    localStorage.setItem(
        guide_key,
        JSON.stringify({ trade_types_selection: true, trade_page: false, positions_page: false })
    );
};

describe('PresetsOnboardingGuide', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should not render when isMobile is false', () => {
        (useDevice as jest.Mock).mockReturnValueOnce({ isMobile: false, isDesktop: true, isTablet: false });

        setGuideAsSeen();
        render(<PresetsOnboardingGuide />);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(screen.queryByText(step1_title)).not.toBeInTheDocument();
    });

    it('should not render when presets_onboarding_guide is already true', () => {
        setGuideAsSeen();
        localStorage.setItem(presets_key, JSON.stringify(true));

        render(<PresetsOnboardingGuide />);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(screen.queryByText(step1_title)).not.toBeInTheDocument();
    });

    it('should not render when no mobile onboarding has been seen', () => {
        render(<PresetsOnboardingGuide />);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(screen.queryByText(step1_title)).not.toBeInTheDocument();
    });

    it('should render step 1 after 800ms when conditions are met', async () => {
        setGuideAsSeen();
        render(<PresetsOnboardingGuide />);

        await act(async () => {
            jest.advanceTimersByTime(900);
        });

        await waitFor(() => {
            expect(screen.getByText(step1_title)).toBeInTheDocument();
        });
    });

    it('should navigate through all steps and close on final step', async () => {
        const user = userEvent.setup({ delay: null });
        setGuideAsSeen();
        render(<PresetsOnboardingGuide />);

        await act(async () => {
            jest.advanceTimersByTime(900);
        });

        await waitFor(() => {
            expect(screen.getByText(step1_title)).toBeInTheDocument();
        });

        jest.useRealTimers();

        // Click Next to go to step 2
        await user.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => {
            expect(screen.getByText(step2_title)).toBeInTheDocument();
        });

        // Click Next to go to step 3
        await user.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => {
            expect(screen.getByText(step3_title)).toBeInTheDocument();
        });

        // Click Got it to close
        await user.click(screen.getByRole('button', { name: /got it/i }));
        await waitFor(() => {
            expect(screen.queryByText(step3_title)).not.toBeInTheDocument();
        });

        // Verify localStorage was set
        expect(JSON.parse(localStorage.getItem(presets_key) as string)).toBe(true);
    });
});
