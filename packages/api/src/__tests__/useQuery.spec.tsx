import React from 'react';

import { renderHook } from '@testing-library/react-hooks';

import { TSocketResponse } from '../../types';
import APIProvider from '../APIProvider';
import useQuery from '../useQuery';

const mock_send = jest.fn();

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    useWS: () => ({
        send: mock_send,
        subscribe: jest.fn(),
    }),
}));

describe('useQuery', () => {
    beforeEach(() => {
        mock_send.mockReset();
        mock_send.mockImplementation(() =>
            Promise.resolve<TSocketResponse<'time'>>({
                msg_type: 'time',
                time: 123456789,
                echo_req: {},
            })
        );
    });

    test('should call time and get response', async () => {
        const wrapper = ({ children }: { children: JSX.Element }) => <APIProvider>{children}</APIProvider>;

        const { result, waitFor } = renderHook(() => useQuery('time'), { wrapper });

        await waitFor(() => result.current.isSuccess, { timeout: 10000 });

        expect(result.current.data?.time).toEqual(123456789);
    });

    test('should surface a ConnectionLost settlement as a query error', async () => {
        // The connection layer settles a request whose connection died with a synthetic
        // error-response (socket_base's APIMiddleware race) — useAPI throws it for React Query.
        mock_send.mockImplementation(() =>
            Promise.resolve({
                echo_req: { time: 1 },
                msg_type: 'time',
                error: { code: 'ConnectionLost', message: 'The connection was lost before a response was received.' },
            })
        );

        const wrapper = ({ children }: { children: JSX.Element }) => <APIProvider>{children}</APIProvider>;

        const { result, waitFor } = renderHook(() => useQuery('time', { options: { retry: false } }), { wrapper });

        await waitFor(() => result.current.isError, { timeout: 10000 });

        expect(result.current.error).toMatchObject({ code: 'ConnectionLost' });
        expect(result.current.isFetching).toBe(false);
    });
});
