import React from 'react';

import { WS } from '@deriv/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';

import useProposalReconnectReset from '../useProposalReconnectReset';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    WS: {
        setOnReconnect: jest.fn(),
        removeOnReconnect: jest.fn(),
    },
}));

describe('useProposalReconnectReset', () => {
    let query_client: QueryClient, reset_queries_spy: jest.SpyInstance;

    const renderHookWithClient = () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={query_client}>{children}</QueryClientProvider>
        );
        return renderHook(() => useProposalReconnectReset(), { wrapper });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        query_client = new QueryClient();
        reset_queries_spy = jest.spyOn(query_client, 'resetQueries');
    });

    afterEach(() => {
        query_client.clear();
    });

    it('resets all proposal queries when the socket reconnects', () => {
        renderHookWithClient();

        const reconnect_handler = (WS.setOnReconnect as jest.Mock).mock.calls[0][0];
        reconnect_handler();

        expect(reset_queries_spy).toHaveBeenCalledWith({ queryKey: ['proposal'] });
    });

    it('restarts a query stuck mid-flight at reconnect time', () => {
        renderHookWithClient();

        query_client.fetchQuery(
            ['proposal', '{"amount":150}'],
            () =>
                new Promise(() => {
                    // never settles: a request orphaned on a dead socket
                })
        );
        expect(query_client.getQueryState(['proposal', '{"amount":150}'])?.fetchStatus).toBe('fetching');

        const reconnect_handler = (WS.setOnReconnect as jest.Mock).mock.calls[0][0];
        reconnect_handler();

        expect(query_client.getQueryState(['proposal', '{"amount":150}'])?.fetchStatus).toBe('idle');
    });

    it('removes its reconnect handler on unmount', () => {
        const { unmount } = renderHookWithClient();

        unmount();

        const registered_handler = (WS.setOnReconnect as jest.Mock).mock.calls[0][0];
        expect(WS.removeOnReconnect).toHaveBeenCalledWith(registered_handler);
    });
});
