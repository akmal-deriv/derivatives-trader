import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GuideTooltip, { GuideTooltipProps } from '../guide-tooltip';

const mock_props = {
    index: 2,
    step: {
        title: 'Title',
        content: 'Step content',
    },
    tooltipProps: {},
    isLastStep: false,
    onNext: jest.fn(),
    onClose: jest.fn(),
} as unknown as GuideTooltipProps;

describe('GuideTooltip', () => {
    beforeEach(() => {
        (mock_props.onNext as jest.Mock).mockClear();
        (mock_props.onClose as jest.Mock).mockClear();
    });

    it('renders title, content and a "Next" button when not the last step', () => {
        render(<GuideTooltip {...mock_props} />);

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Step content')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    it('renders a "Done" button on the last step', () => {
        render(<GuideTooltip {...mock_props} isLastStep />);

        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('advances via onNext (with the current step index) when Next is clicked', async () => {
        render(<GuideTooltip {...mock_props} />);
        await userEvent.click(screen.getByText('Next'));

        expect(mock_props.onNext).toHaveBeenCalledWith(2);
        expect(mock_props.onClose).not.toHaveBeenCalled();
    });

    it('finishes via onClose when Done is clicked on the last step', async () => {
        render(<GuideTooltip {...mock_props} isLastStep />);
        await userEvent.click(screen.getByText('Done'));

        expect(mock_props.onClose).toHaveBeenCalled();
        expect(mock_props.onNext).not.toHaveBeenCalled();
    });

    it('finishes via onClose when the close button is clicked', async () => {
        render(<GuideTooltip {...mock_props} />);
        // The close (×) IconButton is the only button besides "Next".
        const buttons = screen.getAllByRole('button');
        await userEvent.click(buttons[0]);

        expect(mock_props.onClose).toHaveBeenCalled();
    });
});
