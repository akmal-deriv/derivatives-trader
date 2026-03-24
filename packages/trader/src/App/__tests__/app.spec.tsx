import React from 'react';
import moment from 'moment';

import { trackAnalyticsEvent } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { render } from '@testing-library/react';

import App from '../app';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    trackAnalyticsEvent: jest.fn(),
}));

const mockTrackAnalyticsEvent = trackAnalyticsEvent as jest.MockedFunction<typeof trackAnalyticsEvent>;

const rootStore = mockStore({
    common: {
        server_time: moment(new Date()).utc(),
    },
    client: {
        is_logged_in: false,
    },
});

const mockWs = {
    activeSymbols: jest.fn(),
    authorized: {
        activeSymbols: jest.fn(),
        subscribeProposalOpenContract: jest.fn(),
        send: jest.fn(),
    },
    buy: jest.fn(),
    storage: {
        contractsFor: jest.fn(),
        send: jest.fn(),
    },
    contractUpdate: jest.fn(),
    contractUpdateHistory: jest.fn(),
    subscribeTicksHistory: jest.fn(),
    forgetStream: jest.fn(),
    forget: jest.fn(),
    forgetAll: jest.fn(),
    send: jest.fn(),
    subscribeProposal: jest.fn(),
    subscribeTicks: jest.fn(),
    time: jest.fn(),
    tradingTimes: jest.fn(),
    wait: jest.fn(),
};

jest.mock('App/Containers/Routes/routes', () => jest.fn(() => <div>Router</div>));
jest.mock('App/init-store', () => jest.fn(rootStore => rootStore));

describe('App', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the app component', () => {
        const { container } = render(
            <App
                passthrough={{
                    root_store: rootStore,
                    WS: mockWs,
                }}
            />
        );
        expect(container).toBeInTheDocument();
    });

    it('should call setPromptHandler on unmount', () => {
        const setPromptHandler = jest.fn();
        rootStore.ui.setPromptHandler = setPromptHandler;
        const { unmount } = render(
            <App
                passthrough={{
                    root_store: rootStore,
                    WS: mockWs,
                }}
            />
        );
        unmount();
        expect(setPromptHandler).toHaveBeenCalledWith(false);
    });

    it('should fire analytics event when not logging in', () => {
        const store = mockStore({
            common: { server_time: moment(new Date()).utc() },
            client: { is_logged_in: false, is_logging_in: false },
        });
        render(<App passthrough={{ root_store: store, WS: mockWs }} />);
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('ce_dtrader_app_v2', { action: 'open' });
    });

    it('should not fire analytics event while login is in progress', () => {
        const store = mockStore({
            common: { server_time: moment(new Date()).utc() },
            client: { is_logged_in: false, is_logging_in: true },
        });
        render(<App passthrough={{ root_store: store, WS: mockWs }} />);
        expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
    });
});
