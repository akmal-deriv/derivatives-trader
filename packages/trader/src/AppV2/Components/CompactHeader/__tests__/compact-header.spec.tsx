import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../trader-providers';
import CompactHeader from '../compact-header';

const mockRedirectToLogin = jest.fn();
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    getSymbolDisplayName: jest.fn(() => 'Volatility 100 (1s) Index'),
    getContractTypesConfig: jest.fn(() => ({ rise_fall: { title: 'Rise/Fall' } })),
    getCurrencyDisplayCode: jest.fn((currency: string) => currency),
    addComma: jest.fn((num: number | string) => String(num)),
    redirectToLogin: (...args: unknown[]) => mockRedirectToLogin(...args),
}));

jest.mock('AppV2/Components/SymbolIconsMapper/symbol-icons-mapper', () => {
    const MockSymbolIconsMapper = () => <div data-testid='dt_symbol_icon' />;
    return MockSymbolIconsMapper;
});

describe('CompactHeader', () => {
    const renderHeader = (client_overrides = {}) => {
        const store = mockStore({
            client: {
                balance: '10000.00',
                currency: 'USD',
                is_logged_in: true,
                is_virtual: false,
                ...client_overrides,
            },
            ui: { is_chart_maximized: true },
            modules: { trade: { symbol: '1HZ100V', contract_type: 'rise_fall' } },
        });
        render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <CompactHeader />
                </ModulesProvider>
            </TraderProviders>
        );
    };

    it('renders the symbol name, trade-type and market icon', () => {
        renderHeader();
        expect(screen.getByTestId('dt_symbol_icon')).toBeInTheDocument();
        expect(screen.getByText('Volatility 100 (1s) Index')).toBeInTheDocument();
        expect(screen.getByText('Rise/Fall')).toBeInTheDocument();
    });

    it('renders the real account label and formatted balance', () => {
        renderHeader();
        expect(screen.getByText('Real account')).toBeInTheDocument();
        expect(screen.getByText('10000.00 USD')).toBeInTheDocument();
    });

    it('renders the demo account label for a virtual account', () => {
        renderHeader({ is_virtual: true });
        expect(screen.getByText('Demo account')).toBeInTheDocument();
    });

    it('renders a Log in CTA (not an account label) when logged out', () => {
        renderHeader({ is_logged_in: false });
        expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
        expect(screen.queryByText('Real account')).not.toBeInTheDocument();
        expect(screen.queryByText('Demo account')).not.toBeInTheDocument();
    });

    it('redirects to login when the Log in CTA is clicked', async () => {
        renderHeader({ is_logged_in: false });
        await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(mockRedirectToLogin).toHaveBeenCalledTimes(1);
    });
});
