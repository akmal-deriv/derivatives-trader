import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import RiskManagementInfo from '../risk-management-info';

const mockShouldShowExpiration = jest.fn();
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    shouldShowExpiration: (symbol: string) => mockShouldShowExpiration(symbol),
}));

describe('RiskManagementInfo', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        mockShouldShowExpiration.mockReturnValue(true);
        default_mock_store = mockStore({
            modules: { trade: { expiration: 1700000000, symbol: '1HZ100V' } },
            common: { server_time: { unix: () => 1699990000 } },
        });
    });

    afterEach(() => jest.clearAllMocks());

    const renderInfo = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <RiskManagementInfo />
                </ModulesProvider>
            </TraderProviders>
        );

    it('renders the expiry for symbols that expire', () => {
        renderInfo();

        expect(screen.getByText('Expires on')).toBeInTheDocument();
    });

    it('renders nothing for symbols that do not expire', () => {
        mockShouldShowExpiration.mockReturnValue(false);
        const { container } = renderInfo();

        expect(container).toBeEmptyDOMElement();
    });
});
