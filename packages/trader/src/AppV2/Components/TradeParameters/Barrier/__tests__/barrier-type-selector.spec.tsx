import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BarrierTypeSelector from '../barrier-type-selector';

describe('BarrierTypeSelector', () => {
    const mockOnSelectType = jest.fn();

    const defaultProps = {
        selectedType: 'above_spot',
        onSelectType: mockOnSelectType,
        support: 'relative' as const,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Above spot / Below spot for relative support (no Fixed barrier)', () => {
        render(<BarrierTypeSelector {...defaultProps} />);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(screen.getByRole('tab', { name: 'Above spot' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Below spot' })).toBeInTheDocument();
        expect(screen.queryByText('Fixed barrier')).not.toBeInTheDocument();
    });

    it('renders only the Fixed barrier option for absolute support', () => {
        render(<BarrierTypeSelector {...defaultProps} support='absolute' selectedType='fixed_barrier' />);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(1);
        expect(screen.getByText('Fixed barrier')).toBeInTheDocument();
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('marks the selected sign with aria-selected', () => {
        render(<BarrierTypeSelector {...defaultProps} />);

        expect(screen.getByRole('tab', { name: 'Above spot' })).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onSelectType when the other sign is clicked', async () => {
        render(<BarrierTypeSelector {...defaultProps} />);

        await userEvent.click(screen.getByRole('tab', { name: 'Below spot' }));

        expect(mockOnSelectType).toHaveBeenCalledWith('below_spot');
    });

    it('renders with below_spot selected', () => {
        render(<BarrierTypeSelector {...defaultProps} selectedType='below_spot' />);

        expect(screen.getByRole('tab', { name: 'Below spot' })).toHaveAttribute('aria-selected', 'true');
    });

    it('has proper ARIA attributes for accessibility', () => {
        render(<BarrierTypeSelector {...defaultProps} />);

        const container = screen.getByRole('tablist');
        expect(container).toHaveAttribute('aria-orientation', 'vertical');

        expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    it('supports keyboard navigation', async () => {
        render(<BarrierTypeSelector {...defaultProps} />);

        const tabs = screen.getAllByRole('tab');
        tabs[0].focus();

        await userEvent.keyboard('{ArrowDown}');

        expect(mockOnSelectType).toHaveBeenCalledWith('below_spot');
    });
});
