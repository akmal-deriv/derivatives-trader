import { render, screen } from '@testing-library/react';

import StepContent from '../step-content';

describe('StepContent', () => {
    it('should render title and description', () => {
        render(<StepContent step={{ title: 'Test', description: 'Desc', image: '/test.png' }} />);

        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByText('Desc')).toBeInTheDocument();
    });

    it('should render single image for mobile step', () => {
        render(<StepContent step={{ title: 'Test', description: 'Desc', image: '/mobile.png' }} />);

        expect(screen.getByRole('img')).toHaveAttribute('src', '/mobile.png');
    });

    it('should render light image for desktop step by default', () => {
        render(
            <StepContent
                step={{ title: 'Test', description: 'Desc', image_light: '/light.png', image_dark: '/dark.png' }}
            />
        );

        expect(screen.getByRole('img')).toHaveAttribute('src', '/light.png');
    });

    it('should render dark image for desktop step when is_dark_mode_on is true', () => {
        render(
            <StepContent
                step={{ title: 'Test', description: 'Desc', image_light: '/light.png', image_dark: '/dark.png' }}
                is_dark_mode_on
            />
        );

        expect(screen.getByRole('img')).toHaveAttribute('src', '/dark.png');
    });
});
