import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PageUnavailable from '../PageUnavailable';

jest.mock('@deriv-com/translations', () => ({
    useTranslations: jest.fn(() => ({
        localize: (str: string) => str,
    })),
}));

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => false),
    getBrandHomeUrl: jest.fn(() => 'https://deriv.com/home'),
}));

describe('<PageUnavailable />', () => {
    const renderComponent = () => {
        const history = createMemoryHistory();
        return {
            ...render(
                <Router history={history}>
                    <PageUnavailable />
                </Router>
            ),
            history,
        };
    };

    it('should render the unavailable header', () => {
        renderComponent();
        expect(screen.getByText('Platform unavailable')).toBeInTheDocument();
    });

    it('should render the unavailable message', () => {
        renderComponent();
        expect(
            screen.getByText(
                "This platform isn't supported in your location. Discover our other products by visiting Home."
            )
        ).toBeInTheDocument();
    });

    it('should render the Explore Home button', () => {
        renderComponent();
        expect(screen.getByText('Explore Home')).toBeInTheDocument();
    });

    it('should navigate to brand home URL when button is clicked', async () => {
        Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
        renderComponent();
        await userEvent.click(screen.getByText('Explore Home'));
        expect(window.location.href).toBe('https://deriv.com/home');
    });
});
