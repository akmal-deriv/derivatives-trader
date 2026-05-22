import React from 'react';

import { mockStore, StoreProvider } from '@deriv/stores';
import { act, renderHook, waitFor } from '@testing-library/react';

import { RISK_DISCLOSURE_ACCEPTED_KEY } from 'AppV2/Utils/risk-disclosure-constants';

import { RiskDisclosureProvider, useRiskDisclosure } from '../useRiskDisclosure';

const mockFetchProfileIdentity = jest.fn();
const mockFetchRiskDisclosure = jest.fn();
const mockPostRiskDisclosure = jest.fn();

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    fetchProfileIdentity: () => mockFetchProfileIdentity(),
    fetchRiskDisclosure: () => mockFetchRiskDisclosure(),
    postRiskDisclosure: (body: unknown) => mockPostRiskDisclosure(body),
}));

const buildStore = (overrides?: { is_logged_in?: boolean; is_virtual?: boolean; loginid?: string }) => {
    const store = mockStore({});
    store.client.is_logged_in = overrides?.is_logged_in ?? true;
    store.client.is_virtual = overrides?.is_virtual ?? false;
    store.client.loginid = overrides?.loginid ?? 'ROT1';
    return store;
};

const field = (value: boolean | null) => ({ value, created_at: null, updated_at: null, assigned_by: null });

const makeWrapper = (store: ReturnType<typeof mockStore>) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider store={store}>
            <RiskDisclosureProvider>{children}</RiskDisclosureProvider>
        </StoreProvider>
    );
    Wrapper.displayName = 'TestRiskDisclosureWrapper';
    return Wrapper;
};

describe('useRiskDisclosure', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('returns NOOP values when used outside provider', () => {
        const store = buildStore();
        const Wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider store={store}>{children}</StoreProvider>
        );
        Wrapper.displayName = 'NoProviderWrapper';
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: Wrapper });
        expect(result.current.is_open).toBe(false);
        expect(result.current.is_eligible).toBe(false);
    });

    it('skips evaluation when user is not logged in', async () => {
        const store = buildStore({ is_logged_in: false, loginid: '' });
        renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(mockFetchProfileIdentity).not.toHaveBeenCalled());
    });

    it('skips evaluation on demo accounts', async () => {
        const store = buildStore({ is_virtual: true });
        renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(mockFetchProfileIdentity).not.toHaveBeenCalled());
    });

    it('skips disclosure fetch when residence is not "es"', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'gb' } });
        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(mockFetchProfileIdentity).toHaveBeenCalled());
        expect(mockFetchRiskDisclosure).not.toHaveBeenCalled();
        expect(result.current.is_open).toBe(false);
        expect(result.current.is_eligible).toBe(false);
    });

    it('marks the user eligible (without auto-opening) when residence is "es" and a flag is not accepted', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(null),
            additional_risk_disclosure_accepted: field(true),
        });
        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));
        expect(result.current.is_open).toBe(false);
        expect(result.current.is_fully_accepted).toBe(false);
    });

    it('marks the user fully accepted when both flags are already accepted', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(true),
            additional_risk_disclosure_accepted: field(true),
        });
        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_fully_accepted).toBe(true));
        expect(result.current.is_open).toBe(false);
    });

    it('opens the modal only when open() is called', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(null),
            additional_risk_disclosure_accepted: field(null),
        });
        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));
        expect(result.current.is_open).toBe(false);

        act(() => result.current.open());
        expect(result.current.is_open).toBe(true);
    });

    it('posts only the field currently not accepted on accept', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(true),
            additional_risk_disclosure_accepted: field(null),
        });
        mockPostRiskDisclosure.mockResolvedValueOnce({});

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));

        act(() => result.current.open());
        await act(async () => {
            await result.current.accept();
        });

        expect(mockPostRiskDisclosure).toHaveBeenCalledTimes(1);
        expect(mockPostRiskDisclosure).toHaveBeenCalledWith({ additional_risk_disclosure_accepted: true });
        expect(result.current.is_fully_accepted).toBe(true);
        expect(result.current.is_open).toBe(false);
    });

    it('sends a single POST with both fields when neither is accepted', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(null),
            additional_risk_disclosure_accepted: field(null),
        });
        mockPostRiskDisclosure.mockResolvedValueOnce({});

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));

        act(() => result.current.open());
        await act(async () => {
            await result.current.accept();
        });

        expect(mockPostRiskDisclosure).toHaveBeenCalledTimes(1);
        expect(mockPostRiskDisclosure).toHaveBeenCalledWith({
            risk_disclosure: true,
            additional_risk_disclosure_accepted: true,
        });
        expect(result.current.is_fully_accepted).toBe(true);
        expect(result.current.is_open).toBe(false);
    });

    it('keeps the modal open on POST failure and exposes the error', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(null),
            additional_risk_disclosure_accepted: field(null),
        });
        mockPostRiskDisclosure.mockResolvedValueOnce({ error: { message: 'boom' } });

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));

        act(() => result.current.open());
        await act(async () => {
            await result.current.accept();
        });

        expect(result.current.is_open).toBe(true);
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('boom');
    });

    it('writes risk_disclosure_accepted=true to localStorage after a successful POST', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({
            risk_disclosure_accepted: field(null),
            additional_risk_disclosure_accepted: field(null),
        });
        mockPostRiskDisclosure.mockResolvedValueOnce({});

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_eligible).toBe(true));

        act(() => result.current.open());
        await act(async () => {
            await result.current.accept();
        });

        expect(localStorage.getItem(`${RISK_DISCLOSURE_ACCEPTED_KEY}_ROT1`)).toBe('true');
    });

    it('skips API calls and stays fully accepted when localStorage flag is set', async () => {
        localStorage.setItem(`${RISK_DISCLOSURE_ACCEPTED_KEY}_ROT1`, 'true');

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(result.current.is_fully_accepted).toBe(true));

        expect(mockFetchProfileIdentity).not.toHaveBeenCalled();
        expect(mockFetchRiskDisclosure).not.toHaveBeenCalled();
    });

    it('fails open if the profile request returns an error', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ error: { message: 'network down' } });
        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(mockFetchProfileIdentity).toHaveBeenCalled());
        expect(mockFetchRiskDisclosure).not.toHaveBeenCalled();
        expect(result.current.is_open).toBe(false);
        expect(result.current.is_eligible).toBe(false);
    });

    it('fails open (does not mark eligible) when the disclosure GET returns an error for an "es" user', async () => {
        mockFetchProfileIdentity.mockResolvedValueOnce({ data: { residence: 'es' } });
        mockFetchRiskDisclosure.mockResolvedValueOnce({ error: { message: 'server error' } });

        const store = buildStore();
        const { result } = renderHook(() => useRiskDisclosure(), { wrapper: makeWrapper(store) });
        await waitFor(() => expect(mockFetchRiskDisclosure).toHaveBeenCalled());

        expect(result.current.is_eligible).toBe(false);
        expect(result.current.is_fully_accepted).toBe(false);
    });
});
