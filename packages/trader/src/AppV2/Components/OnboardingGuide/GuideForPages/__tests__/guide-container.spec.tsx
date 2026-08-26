import React from 'react';
import { CallBackProps } from 'react-joyride';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GuideContainer from '../guide-container';
import { TOnboardingStep } from '../steps-config';

const mockJoyride = jest.fn();

jest.mock('react-joyride', () => ({
    __esModule: true,
    default: (props: { callback: (data: CallBackProps) => void; steps: unknown[]; run: boolean }) => {
        mockJoyride(props);
        return (
            <div>
                <p>Joyride</p>
                <button onClick={() => props.callback({ status: 'finished' } as CallBackProps)}>finish</button>
                <button onClick={() => props.callback({ status: 'skipped' } as CallBackProps)}>skip</button>
            </div>
        );
    },
    STATUS: { SKIPPED: 'skipped', FINISHED: 'finished' },
}));

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: false }) }));

const mockSetMarketSelectorOpen = jest.fn();
const mockSetActiveTradePanelTab = jest.fn();
jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: () => ({
        setMarketSelectorOpen: mockSetMarketSelectorOpen,
        setActiveTradePanelTab: mockSetActiveTradePanelTab,
    }),
}));

// Controlled steps so the filter behaviour is deterministic.
const mock_steps: TOnboardingStep[] = [];
jest.mock('../steps-config', () => ({
    __esModule: true,
    default: () => mock_steps,
}));

const mock_props = { should_run: true, onFinishGuide: jest.fn() };

describe('GuideContainer', () => {
    beforeEach(() => {
        mockJoyride.mockClear();
        mock_props.onFinishGuide.mockClear();
        mockSetMarketSelectorOpen.mockClear();
        document.body.innerHTML = '';
        mock_steps.length = 0;
    });

    it('renders Joyride', () => {
        mock_steps.push({ target: '.present', content: 'x' });
        const el = document.createElement('div');
        el.className = 'present';
        document.body.appendChild(el);

        render(<GuideContainer {...mock_props} />);
        expect(screen.getByText('Joyride')).toBeInTheDocument();
    });

    it('calls onFinishGuide (and closes the selector) on a finished status', async () => {
        mock_steps.push({ target: '.present', content: 'x' });
        document.body.appendChild(Object.assign(document.createElement('div'), { className: 'present' }));

        render(<GuideContainer {...mock_props} />);
        await userEvent.click(screen.getByText('finish'));

        expect(mock_props.onFinishGuide).toHaveBeenCalled();
        expect(mockSetMarketSelectorOpen).toHaveBeenLastCalledWith(false);
    });

    it('calls onFinishGuide (and closes the selector) when the tour is skipped/closed', async () => {
        mock_steps.push({ target: '.present', content: 'x' });
        document.body.appendChild(Object.assign(document.createElement('div'), { className: 'present' }));

        render(<GuideContainer {...mock_props} />);
        await userEvent.click(screen.getByText('skip'));

        expect(mock_props.onFinishGuide).toHaveBeenCalled();
        expect(mockSetMarketSelectorOpen).toHaveBeenLastCalledWith(false);
    });

    it('keeps steps whose target is present or that create their own anchor (prepare hook); drops missing ones', () => {
        mock_steps.push(
            { target: '.missing', content: 'a', prepare: jest.fn() }, // kept: creates its own anchor
            { target: '.present', content: 'b' }, // kept: in DOM
            { target: '.missing-2', content: 'c' } // dropped
        );
        document.body.appendChild(Object.assign(document.createElement('div'), { className: 'present' }));

        render(<GuideContainer {...mock_props} />);

        const last_call = mockJoyride.mock.calls.at(-1)?.[0];
        expect(last_call.steps).toHaveLength(2);
        expect(last_call.run).toBe(true);
        expect(mock_props.onFinishGuide).not.toHaveBeenCalled();
    });

    it('finishes immediately when no step targets are present and none open their own anchor', () => {
        mock_steps.push({ target: '.missing-1', content: 'one' }, { target: '.missing-2', content: 'two' });

        render(<GuideContainer {...mock_props} />);

        const last_call = mockJoyride.mock.calls.at(-1)?.[0];
        expect(last_call.steps).toHaveLength(0);
        expect(last_call.run).toBe(false);
        expect(mock_props.onFinishGuide).toHaveBeenCalled();
    });
});
