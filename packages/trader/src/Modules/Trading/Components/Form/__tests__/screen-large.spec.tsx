import React from 'react';

import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';

import TraderProviders from '../../../../../trader-providers';
import ScreenLarge from '../screen-large';

jest.mock('App/Components/Elements/ContentLoader', () => ({
    ...jest.requireActual('App/Components/Elements/ContentLoader'),
    TradeParamsLoader: jest.fn(() => 'MockedLoader'),
}));
jest.mock('../../../Containers/contract-type', () => jest.fn(() => 'MockedContractType'));
jest.mock('../../../Containers/purchase', () => jest.fn(() => 'MockedPurchase'));
jest.mock('../../../Containers/trade-params', () => jest.fn(() => 'MockedTradeParams'));
jest.mock('../../Elements/trade-params-footer', () => jest.fn(() => 'MockedTradeParamsFooter'));

const mock_props = {
    is_market_closed: false,
    is_trade_enabled: false,
};

const mock_store = mockStore({
    ui: {
        notification_messages_ui: 'div',
    },
});

describe('ScreenLarge', () => {
    it('should render TradeParamsLoader component if is_market_closed is false', () => {
        render(
            <TraderProviders store={mock_store}>
                <ScreenLarge {...mock_props} />
            </TraderProviders>
        );

        expect(screen.getByText('MockedLoader')).toBeInTheDocument();
    });
    it('should render ContractType, TradeParams and Purchase component if is_trade_enabled is true', () => {
        render(
            <TraderProviders store={mock_store}>
                <ScreenLarge is_trade_enabled />
            </TraderProviders>
        );

        expect(screen.getByText('MockedContractType')).toBeInTheDocument();
        expect(screen.getByText('MockedPurchase')).toBeInTheDocument();
        expect(screen.getByText('MockedTradeParams')).toBeInTheDocument();
    });
});
