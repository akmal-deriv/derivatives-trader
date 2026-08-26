import React from 'react';
import { BrowserRouter, useHistory, useLocation } from 'react-router-dom';

import { routes } from '@deriv/shared';
import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ContractDetailsHeader from '../contract-details-header';

jest.mock('@deriv-com/quill-ui', () => ({
    Text: () => <div>Contract Details</div>,
    IconButton: ({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) => (
        <button onClick={onClick}>{icon}</button>
    ),
}));
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
    useHistory: jest.fn().mockReturnValue({
        goBack: jest.fn(),
    }),
}));

describe('ContractDetailsHeader', () => {
    const mock_store = mockStore({
        contract_replay: {
            onClickCancel: jest.fn(),
            onClickSell: jest.fn(),
            is_sell_requested: false,
        },
        common: {
            routeBackInApp: jest.fn(),
        },
    });
    test('renders the header with localized text and an icon', () => {
        render(
            <StoreProvider store={mock_store}>
                <BrowserRouter>
                    <ContractDetailsHeader />
                </BrowserRouter>
            </StoreProvider>
        );

        expect(screen.getByText('Contract Details')).toBeInTheDocument();
        const icon = screen.getByTestId('arrow');
        expect(icon).toBeInTheDocument();
    });

    test('clicking the back arrow calls routeBackInApp from DTrader page', async () => {
        render(
            <StoreProvider store={mock_store}>
                <BrowserRouter>
                    <ContractDetailsHeader />
                </BrowserRouter>
            </StoreProvider>
        );

        await userEvent.click(screen.getByTestId('arrow'));

        expect(mock_store.common.routeBackInApp).toHaveBeenCalled();
    });

    test('clicking the back arrow returns to the automate route for an automation contract', async () => {
        const historyMock = {
            goBack: jest.fn(),
            push: jest.fn(),
        };
        (useLocation as jest.Mock).mockReturnValue({ pathname: '' });
        (useHistory as jest.Mock).mockReturnValue(historyMock);
        const automation_store = mockStore({
            contract_replay: {
                contract_store: { contract_info: { auto_run_id: 'run_1' } },
            },
            common: {
                routeBackInApp: jest.fn(),
            },
        });
        render(
            <StoreProvider store={automation_store}>
                <BrowserRouter>
                    <ContractDetailsHeader />
                </BrowserRouter>
            </StoreProvider>
        );

        await userEvent.click(screen.getByTestId('arrow'));

        expect(historyMock.push).toHaveBeenCalledWith(routes.trader_automate);
        expect(automation_store.common.routeBackInApp).not.toHaveBeenCalled();
    });

    test('clicking the back arrow calls history go back from Reports page', async () => {
        const historyMock = {
            goBack: jest.fn(),
        };
        (useLocation as jest.Mock).mockReturnValue({
            pathname: '',
            state: { from_table_row: true },
        });
        (useHistory as jest.Mock).mockReturnValue(historyMock);
        render(
            <StoreProvider store={mock_store}>
                <BrowserRouter>
                    <ContractDetailsHeader />
                </BrowserRouter>
            </StoreProvider>
        );

        await userEvent.click(screen.getByTestId('arrow'));

        expect(historyMock.goBack).toHaveBeenCalled();
    });
});
