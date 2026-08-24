import React from 'react';

import { WS } from '@deriv/shared';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Re-issues React-Query `proposal` queries when the WebSocket reconnects.
 *
 * The shared QueryClient sets `refetchOnReconnect: false`, and `useProposal` is a one-shot
 * `useQuery('proposal', { cacheTime: 0, retry: false })`. A request in flight when the connection
 * dies now rejects with `ConnectionLost` (socket_base settles pending requests on connection
 * death), which puts the query in error state — this hook completes the recovery by resetting
 * proposal queries on reconnect so active observers re-fetch over the fresh socket automatically,
 * instead of waiting for the user to change the stake. `resetQueries` (NOT `invalidateQueries`,
 * which will not restart an already-`fetching` query) also covers a query still mid-flight at
 * reconnect time.
 */
const useProposalReconnectReset = () => {
    const queryClient = useQueryClient();

    React.useEffect(() => {
        const handleReconnect = () => {
            queryClient.resetQueries({ queryKey: ['proposal'] });
        };

        WS.setOnReconnect(handleReconnect);
        return () => WS.removeOnReconnect(handleReconnect);
    }, [queryClient]);
};

export default useProposalReconnectReset;
