import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketSelectionHeader from '../market-selection-header';

jest.mock('../../Guide', () => {
    const Guide = () => <div data-testid='guide' />;
    return Guide;
});

describe('MarketSelectionHeader', () => {
    it('renders Close, Guide and Search controls', () => {
        render(<MarketSelectionHeader onClose={jest.fn()} onSearch={jest.fn()} />);
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
        expect(screen.getByTestId('guide')).toBeInTheDocument();
    });

    it('calls onClose and onSearch', async () => {
        const onClose = jest.fn();
        const onSearch = jest.fn();
        render(<MarketSelectionHeader onClose={onClose} onSearch={onSearch} />);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await userEvent.click(screen.getByRole('button', { name: 'Search' }));
        expect(onClose).toHaveBeenCalled();
        expect(onSearch).toHaveBeenCalled();
    });
});
