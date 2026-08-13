import { APIProvider } from '@deriv/api';
import { formatMoney } from '@deriv/shared';
import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';

import AccountInfo from '../account-info';

// Mock the required functions from @deriv/shared. isDemoAccountId keeps its real
// prefix-based implementation (via requireActual) so demo/real is driven by loginid.
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    addComma: jest.fn(value => value),
    getCurrencyDisplayCode: jest.fn(currency => currency),
    formatMoney: jest.fn((_currency, balance) => String(balance)),
}));

jest.mock('@deriv-com/ui', () => ({
    useDevice: jest.fn(() => ({ isMobile: false })),
}));

jest.mock('@deriv/quill-icons', () => ({
    LegacyChevronDown1pxIcon: () => <div data-testid='chevron-icon'>Chevron</div>,
}));

jest.mock('@deriv-com/quill-ui', () => ({
    ActionSheet: {
        Root: ({ children }: any) => <div data-testid='action-sheet-root'>{children}</div>,
        Portal: ({ children }: any) => <div data-testid='action-sheet-portal'>{children}</div>,
    },
}));

jest.mock('../account-switcher', () => {
    return jest.fn(() => <div data-testid='account-switcher'>Account Switcher</div>);
});

const mockFormatMoney = formatMoney as jest.MockedFunction<typeof formatMoney>;

// DOT* → demo, ROT* → real (server/type derived purely from the account_id prefix).
const REAL_ACCOUNT_ID = 'ROT90070611';
const DEMO_ACCOUNT_ID = 'DOT90096855';

const defaultAccounts = [
    {
        account_id: REAL_ACCOUNT_ID,
        account_type: 'real' as const,
        balance: '10000.00',
        currency: 'USD',
        group: 'real',
        status: 'active' as const,
    },
    {
        account_id: DEMO_ACCOUNT_ID,
        account_type: 'demo' as const,
        balance: '5000.00',
        currency: 'USD',
        group: 'demo',
        status: 'active' as const,
    },
];

const renderWithProviders = (client_config = {}, props_override = {}, ui_config = {}) => {
    const default_mock_store = mockStore({
        client: {
            loginid: REAL_ACCOUNT_ID,
            is_logged_in: true,
            ...client_config,
        },
        ui: {
            ...ui_config,
        },
    });

    const default_props = {
        accounts: defaultAccounts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        ...props_override,
    };

    return render(
        <APIProvider>
            <StoreProvider store={default_mock_store}>
                <AccountInfo {...default_props} />
            </StoreProvider>
        </APIProvider>
    );
};

describe('AccountInfo component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFormatMoney.mockImplementation((_currency, balance) => String(balance));
    });

    it('should have "acc-info--is-demo" class when the active account is a DOT (demo) account', () => {
        renderWithProviders({ loginid: DEMO_ACCOUNT_ID });
        const div_element = screen.getByTestId('dt_acc_info');
        expect(div_element).toHaveClass('acc-info--is-demo');
    });

    it('should have "acc-info__balance--no-currency" class when account is real and we don\'t have currency', () => {
        renderWithProviders({
            currency: undefined,
            balance: undefined,
        });
        const balance_wrapper = screen.getByTestId('dt_balance');
        expect(balance_wrapper).toHaveClass('acc-info__balance--no-currency');
    });

    it('should have "No currency assigned" text when we don\'t have currency', () => {
        renderWithProviders({
            currency: undefined,
            balance: undefined,
        });
        const text = screen.getByText(/no currency assigned/i);
        expect(text).toBeInTheDocument();
    });

    it('should display balance and currency when both are provided', () => {
        mockFormatMoney.mockReturnValue('123456789');
        renderWithProviders({
            currency: 'USD',
            balance: 123456789,
        });
        const text = screen.getByText(/123456789 USD/i);
        expect(text).toBeInTheDocument();
        expect(screen.queryByText(/no currency assigned/i)).not.toBeInTheDocument();
    });

    it('should display "Real account" type label for real accounts', () => {
        renderWithProviders({
            currency: 'USD',
            balance: 1000,
        });
        const accountTypeLabel = screen.getByText('Real account');
        expect(accountTypeLabel).toBeInTheDocument();
    });

    it('should display "Demo account" type label for demo accounts', () => {
        renderWithProviders({
            loginid: DEMO_ACCOUNT_ID,
            currency: 'USD',
            balance: 1000,
        });
        const accountTypeLabel = screen.getByText('Demo account');
        expect(accountTypeLabel).toBeInTheDocument();
    });

    describe('Demo-only account behavior', () => {
        it('should hide chevron icon for demo-only accounts', () => {
            renderWithProviders(
                {
                    loginid: DEMO_ACCOUNT_ID,
                    currency: 'USD',
                    balance: 1000,
                },
                {
                    // Pass only demo accounts as props
                    accounts: [
                        { account_id: DEMO_ACCOUNT_ID, account_type: 'demo', balance: '5000.00', currency: 'USD' },
                    ],
                }
            );

            expect(screen.queryByTestId('chevron-icon')).not.toBeInTheDocument();
        });

        it('should show chevron icon when user has multiple account types', () => {
            renderWithProviders({
                currency: 'USD',
                balance: 1000,
            });

            expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
        });

        it('should not render AccountSwitcher for demo-only accounts', () => {
            renderWithProviders(
                {
                    loginid: DEMO_ACCOUNT_ID,
                    currency: 'USD',
                    balance: 1000,
                },
                {
                    // Pass only demo accounts as props
                    accounts: [
                        { account_id: DEMO_ACCOUNT_ID, account_type: 'demo', balance: '5000.00', currency: 'USD' },
                    ],
                }
            );

            expect(screen.queryByTestId('account-switcher')).not.toBeInTheDocument();
        });

        it('should render AccountSwitcher when user has multiple account types', () => {
            renderWithProviders({
                currency: 'USD',
                balance: 1000,
            });

            expect(screen.getByTestId('account-switcher')).toBeInTheDocument();
        });

        it('should apply acc-info--no-switcher class for demo-only accounts', () => {
            renderWithProviders(
                {
                    loginid: DEMO_ACCOUNT_ID,
                    currency: 'USD',
                    balance: 1000,
                },
                {
                    // Pass only demo accounts as props
                    accounts: [
                        { account_id: DEMO_ACCOUNT_ID, account_type: 'demo', balance: '5000.00', currency: 'USD' },
                    ],
                }
            );

            const accInfoElement = screen.getByTestId('dt_acc_info');
            expect(accInfoElement).toHaveClass('acc-info--no-switcher');
        });

        it('should not apply acc-info--no-switcher class when user has multiple account types', () => {
            renderWithProviders({
                currency: 'USD',
                balance: 1000,
            });

            const accInfoElement = screen.getByTestId('dt_acc_info');
            expect(accInfoElement).not.toHaveClass('acc-info--no-switcher');
        });
    });

    describe('Chart loading behavior', () => {
        it('should show account info regardless of chart loading state', () => {
            renderWithProviders({ currency: 'USD', balance: 1000 }, {}, { is_chart_loading: true });

            expect(screen.queryByTestId('dt_skeleton')).not.toBeInTheDocument();
            expect(screen.getByTestId('dt_acc_info')).toBeInTheDocument();
        });
    });
});
