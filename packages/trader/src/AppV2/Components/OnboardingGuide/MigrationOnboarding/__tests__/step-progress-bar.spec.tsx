import { render, screen } from '@testing-library/react';

import StepProgressBar from '../step-progress-bar';

describe('StepProgressBar', () => {
    it('should render correct number of segments', () => {
        render(<StepProgressBar total_steps={5} current_step={0} />);

        expect(screen.getAllByTestId(/progress-segment/)).toHaveLength(5);
    });

    it('should mark only the first segment as active when current_step is 0', () => {
        render(<StepProgressBar total_steps={5} current_step={0} />);

        const segments = screen.getAllByTestId(/progress-segment/);
        const active = segments.filter(el => el.className.includes('--active'));
        expect(active).toHaveLength(1);
    });

    it('should mark segments up to current_step as active', () => {
        render(<StepProgressBar total_steps={5} current_step={3} />);

        const segments = screen.getAllByTestId(/progress-segment/);
        const active = segments.filter(el => el.className.includes('--active'));
        expect(active).toHaveLength(4); // indices 0, 1, 2, 3
    });

    it('should mark all segments as active on last step', () => {
        render(<StepProgressBar total_steps={5} current_step={4} />);

        const segments = screen.getAllByTestId(/progress-segment/);
        const active = segments.filter(el => el.className.includes('--active'));
        expect(active).toHaveLength(5);
    });
});
