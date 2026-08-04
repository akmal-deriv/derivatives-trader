import { render, screen } from '@testing-library/react';

import MarketSparkline from '../market-sparkline';

describe('MarketSparkline', () => {
    it('renders nothing when there are fewer than two points', () => {
        const { container } = render(<MarketSparkline data={[1]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for an empty series', () => {
        const { container } = render(<MarketSparkline data={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the sparkline svg for a valid series', () => {
        render(<MarketSparkline data={[1, 3, 2, 5]} />);
        expect(screen.getByTestId('dt_market_sparkline')).toBeInTheDocument();
    });

    it('forwards the className for direction colouring', () => {
        render(<MarketSparkline data={[1, 2]} className='market-card__spark market-card__spark--positive' />);
        expect(screen.getByTestId('dt_market_sparkline')).toHaveClass('market-card__spark--positive');
    });
});
