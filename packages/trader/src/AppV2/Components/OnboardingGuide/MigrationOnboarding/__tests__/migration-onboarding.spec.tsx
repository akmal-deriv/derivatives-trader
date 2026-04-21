import React from 'react';

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MigrationOnboarding from '../migration-onboarding';

const localStorage_key = 'migration_onboarding_completed';
const welcome_title = 'Welcome to new Deriv Trader';
const step5_title = 'All new chart experience';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: true, isDesktop: false, isTablet: false })),
}));

jest.mock('@deriv-com/quill-ui', () => ({
    Button: ({ label, onClick }: { label: React.ReactNode; onClick: () => void }) => (
        <button onClick={onClick}>{label}</button>
    ),
}));

describe('MigrationOnboarding', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should render the guide after 800ms', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        expect(screen.queryByText(welcome_title)).not.toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        jest.useRealTimers();
    });

    it('should not render the guide when already completed', async () => {
        localStorage.setItem(localStorage_key, JSON.stringify(true));
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.queryByText(welcome_title)).not.toBeInTheDocument();
        });

        jest.useRealTimers();
    });

    it('should show step 1 with no Back button on first step', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.queryByText('Back')).not.toBeInTheDocument();

        jest.useRealTimers();
    });

    it('should navigate to last step and show Got it button', async () => {
        const user = userEvent.setup({ delay: null });
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        jest.useRealTimers();

        // Navigate through all steps
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));

        expect(screen.getByText(step5_title)).toBeInTheDocument();
        expect(screen.getByText('Got it')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should navigate back to first step', async () => {
        const user = userEvent.setup({ delay: null });
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        jest.useRealTimers();

        // Go forward then back
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Back'));

        expect(screen.getByText(welcome_title)).toBeInTheDocument();
        expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should close guide and set guide_completed on Got it click', async () => {
        const user = userEvent.setup({ delay: null });
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        jest.useRealTimers();

        // Navigate to last step
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));

        expect(screen.getByText('Got it')).toBeInTheDocument();

        await user.click(screen.getByText('Got it'));

        await waitFor(() => {
            expect(screen.queryByText(step5_title)).not.toBeInTheDocument();
        });

        expect(JSON.parse(localStorage.getItem(localStorage_key) as string)).toBe(true);
    });

    it('should close guide and set guide_completed on close button click', async () => {
        const user = userEvent.setup({ delay: null });
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        jest.useRealTimers();

        await user.click(screen.getByRole('button', { name: '' }));

        await waitFor(() => {
            expect(screen.queryByText(welcome_title)).not.toBeInTheDocument();
        });

        expect(JSON.parse(localStorage.getItem(localStorage_key) as string)).toBe(true);
    });

    it('should show progress bar with correct number of segments', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        render(<MigrationOnboarding />);

        act(() => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByText(welcome_title)).toBeInTheDocument();
        });

        const segments = screen.getAllByTestId(/progress-segment/);
        expect(segments).toHaveLength(5);

        const active_segments = segments.filter(el => el.className.includes('--active'));
        expect(active_segments).toHaveLength(1);

        jest.useRealTimers();
    });
});
