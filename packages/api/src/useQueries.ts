import { useQueries as _useQueries, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import type {
    TSocketAcceptableProps,
    TSocketEndpointNames,
    TSocketError,
    TSocketRequestPayload,
    TSocketRequestQueryOptions,
    TSocketResponseData,
} from '../types';

import useAPI from './useAPI';
import { getQueryKeys } from './utils';

// One item is the same `{ payload?, options? }` shape `useQuery` accepts as its single prop — so the
// payload/options extraction below is identical to `useQuery`'s and casts the same way.
type TQueryItem<T extends TSocketEndpointNames> = NonNullable<TSocketAcceptableProps<T, true>[number]>;

/**
 * Runs several requests to the SAME endpoint in parallel — one per payload in `items`. Shares React
 * Query's cache with `useQuery` for an identical name + payload, so results are deduped/cached across
 * the app. Mirrors `useQuery`, but for a dynamic list of payloads whose length may vary between
 * renders (which calling `useQuery` in a loop can't do safely).
 */
const useQueries = <T extends TSocketEndpointNames>(name: T, items: TQueryItem<T>[]) => {
    const { send } = useAPI();

    // Per item, resolve payload/options exactly as `useQuery` does: the `in` guard drops the optional
    // `undefined` so the payload casts to the send/getQueryKeys param type without an unsafe cast.
    const queries: UseQueryOptions<TSocketResponseData<T>, TSocketError<T>['error']>[] = items.map(item => {
        const payload = 'payload' in item ? (item.payload as TSocketRequestPayload<T>) : undefined;
        const options = 'options' in item ? (item.options as TSocketRequestQueryOptions<T>) : undefined;

        return {
            ...options,
            queryKey: getQueryKeys(name, payload),
            queryFn: () => send(name, payload),
        };
    });

    return _useQueries({ queries }) as UseQueryResult<TSocketResponseData<T>, TSocketError<T>['error']>[];
};

export default useQueries;
