import React from 'react';
import { CallBackProps, Step } from 'react-joyride';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GuideContainer from '../guide-container';

const mockJoyride = jest.fn();

jest.mock('react-joyride', () => ({
    __esModule: true,
    default: (props: { callback: (data: CallBackProps) => void; steps: Step[]; run: boolean }) => {
        mockJoyride(props);
        return (
            <div>
                <p>Joyride</p>
                <button onClick={() => props.callback({ status: 'finished' } as CallBackProps)} />
            </div>
        );
    },
    STATUS: { SKIPPED: 'skipped', FINISHED: 'finished' },
}));

const mock_props = {
    should_run: true,
    onFinishGuide: jest.fn(),
};

describe('GuideContainer', () => {
    beforeEach(() => {
        mockJoyride.mockClear();
        mock_props.onFinishGuide.mockClear();
        document.body.innerHTML = '';
    });

    it('should render component', () => {
        render(<GuideContainer {...mock_props} />);

        expect(screen.getByText('Joyride')).toBeInTheDocument();
    });

    it('should call onFinishGuide inside of callbackHandle if passed status is equal to "skipped" or "finished"', async () => {
        render(<GuideContainer {...mock_props} />);
        await userEvent.click(screen.getByRole('button'));

        expect(mock_props.onFinishGuide).toBeCalled();
    });

    it('should skip steps whose target is not present in the DOM and start from the first available step', () => {
        const custom_steps: Step[] = [
            { target: '.missing-first-target', content: 'first' },
            { target: '.present-second-target', content: 'second' },
            { target: '.present-third-target', content: 'third' },
        ];

        const second = document.createElement('div');
        second.className = 'present-second-target';
        document.body.appendChild(second);
        const third = document.createElement('div');
        third.className = 'present-third-target';
        document.body.appendChild(third);

        render(<GuideContainer {...mock_props} custom_steps={custom_steps} />);

        const last_call = mockJoyride.mock.calls.at(-1)?.[0];
        expect(last_call.steps).toHaveLength(2);
        expect(last_call.steps[0].target).toBe('.present-second-target');
        expect(last_call.run).toBe(true);
        expect(mock_props.onFinishGuide).not.toBeCalled();
    });

    it('should finish the guide immediately when no step targets are present in the DOM', () => {
        const custom_steps: Step[] = [
            { target: '.missing-1', content: 'one' },
            { target: '.missing-2', content: 'two' },
        ];

        render(<GuideContainer {...mock_props} custom_steps={custom_steps} />);

        const last_call = mockJoyride.mock.calls.at(-1)?.[0];
        expect(last_call.steps).toHaveLength(0);
        expect(last_call.run).toBe(false);
        expect(mock_props.onFinishGuide).toBeCalled();
    });
});
