import { render, screen } from '@testing-library/react';

import DescriptionLoader from '../description-loader';

describe('DescriptionLoader', () => {
    it('should render the skeleton loader wrapper', () => {
        render(<DescriptionLoader />);

        expect(screen.getByTestId('dt_description_loader')).toBeInTheDocument();
    });

    it('should render skeleton placeholders for the text content (paragraphs)', () => {
        render(<DescriptionLoader />);

        // Two paragraph skeleton blocks stand in for the description text
        // rendered above and below the animation.
        expect(screen.getAllByTestId('dt_skeleton_paragraph')).toHaveLength(2);
    });

    it('should render skeleton placeholders for both the text lines and the animation (lottie) block', () => {
        render(<DescriptionLoader />);

        // 3 + 2 text-line skeletons plus 1 skeleton for the animation block.
        expect(screen.getAllByTestId('dt_skeleton')).toHaveLength(6);
    });
});
