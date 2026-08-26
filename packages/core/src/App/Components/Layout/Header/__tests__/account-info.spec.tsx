import { APIProvider } from '@deriv/api';
import { formatMoney } from '@deriv/shared';
import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
        Root: ({ children }: { children: React.ReactNode }) => <div data-testid='action-sheet-root'>{children}</div>,
        Portal: ({ children }: { children: React.ReactNode }) => (
            <div data-testid='action-sheet-portal'>{children}</div>
        ),
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

    // Characterization tests: the `color` props asserted here are already correct today, so none of
    // these ever went red. They pin the props half of the colour contract — the half jsdom *can*
    // see, because `Text` writes the requested colour into an inline `--text-color` custom property.
    // The stylesheet half, where the bug lived, is asserted in account-info-colors.spec.ts.
    describe('header text colours', () => {
        const textColorOf = (element: HTMLElement) => element.style.getPropertyValue('--text-color');

        it('renders the demo account balance in the primary text colour', () => {
            renderWithProviders({ loginid: DEMO_ACCOUNT_ID, currency: 'USD', balance: 5000 });

            expect(textColorOf(screen.getByTestId('dt_balance'))).toBe('var(--color-text-primary)');
        });

        it('renders the real account balance in the same primary text colour', () => {
            const { unmount } = renderWithProviders({ loginid: DEMO_ACCOUNT_ID, currency: 'USD', balance: 5000 });
            const demo_balance_color = textColorOf(screen.getByTestId('dt_balance'));
            unmount();

            renderWithProviders({ loginid: REAL_ACCOUNT_ID, currency: 'USD', balance: 10000 });
            const real_balance_color = textColorOf(screen.getByTestId('dt_balance'));

            // Switching account type must not change the balance colour — only the label's does.
            expect(real_balance_color).toBe('var(--color-text-primary)');
            expect(real_balance_color).toBe(demo_balance_color);
        });

        it('keeps the account-type label colour-coded by account type, distinct from the balance', () => {
            const { unmount } = renderWithProviders({ loginid: DEMO_ACCOUNT_ID, currency: 'USD', balance: 5000 });

            const demo_label_color = textColorOf(screen.getByText('Demo account'));
            expect(demo_label_color).toBe('var(--color-text-tertiary)');
            expect(demo_label_color).not.toBe(textColorOf(screen.getByTestId('dt_balance')));
            unmount();

            renderWithProviders({ loginid: REAL_ACCOUNT_ID, currency: 'USD', balance: 10000 });

            const real_label_color = textColorOf(screen.getByText('Real account'));
            expect(real_label_color).toBe('var(--color-text-secondary-alternate)');
            expect(real_label_color).not.toBe(textColorOf(screen.getByTestId('dt_balance')));
        });

        it('renders the "No currency assigned" placeholder in the primary text colour', () => {
            renderWithProviders({ loginid: DEMO_ACCOUNT_ID, currency: undefined, balance: undefined });

            const placeholder = screen.getByText('No currency assigned');
            expect(placeholder).toBe(screen.getByTestId('dt_balance'));
            expect(textColorOf(placeholder)).toBe('var(--color-text-primary)');
        });
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

    describe('Refetch on open', () => {
        it('should call refetch exactly once when the trigger is opened', async () => {
            const refetch = jest.fn();
            renderWithProviders({ currency: 'USD', balance: 1000 }, { refetch });

            await userEvent.click(screen.getByTestId('dt_acc_info'));

            expect(refetch).toHaveBeenCalledTimes(1);
        });

        it('should not call refetch again when the trigger is closed', async () => {
            const refetch = jest.fn();
            renderWithProviders({ currency: 'USD', balance: 1000 }, { refetch });

            await userEvent.click(screen.getByTestId('dt_acc_info'));
            await userEvent.click(screen.getByTestId('dt_acc_info'));

            expect(refetch).toHaveBeenCalledTimes(1);
        });

        it('should not throw when opened without a refetch prop', async () => {
            renderWithProviders({ currency: 'USD', balance: 1000 }, { refetch: undefined });

            await expect(userEvent.click(screen.getByTestId('dt_acc_info'))).resolves.not.toThrow();
        });
    });
});
