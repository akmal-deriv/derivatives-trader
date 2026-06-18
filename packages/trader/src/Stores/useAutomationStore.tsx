import React from 'react';
import { observer } from 'mobx-react-lite';

import { type TAutoRun, useQuery, useSubscription } from '@deriv/api';
import { useWS } from '@deriv/shared';
import { useStore } from '@deriv/stores';

import AutomationStore from './Modules/Trading/automation-store';

export const AutomationStoreContext = React.createContext<AutomationStore | null>(null);

type TAutomationSubscriptionContext = {
    subscribeToRun: (run_id: string) => void;
    unsubscribe: () => void;
    resync: () => Promise<TAutoRun | null>;
};

const AutomationSubscriptionContext = React.createContext<TAutomationSubscriptionContext | null>(null);

// Owns `auto_get` + the auto_list recovery flow (initial auth, account
// switch, WS reconnect). `observer` keeps the `loginid` read reactive.
const AutomationSubscriptionManager = observer(({ children }: React.PropsWithChildren<unknown>) => {
    const { subscribe, unsubscribe, data } = useSubscription('auto_get');
    const automation_store = React.useContext(AutomationStoreContext);
    const { client } = useStore();
    const loginid = client?.loginid;
    const WS = useWS();

    const recovered_for_loginid = React.useRef<string | null>(null);

    // refetch-only — we never want react-query to auto-fetch on mount.
    const { refetch } = useQuery('auto_list', { options: { enabled: false } });

    // `onRunUpdate` mutates the MobX store, which is a side effect — must
    // run after commit, not during render.
    React.useEffect(() => {
        if (data?.auto_get && automation_store) {
            automation_store.onRunUpdate(data.auto_get);
        }
    }, [data?.auto_get, automation_store]);

    const subscribeToRun = React.useCallback(
        (run_id: string) => {
            unsubscribe();
            subscribe({ payload: { run_id } });
        },
        [subscribe, unsubscribe]
    );

    // Silent re-sync (no `is_recovering` loading state): refetch auto_list and
    // adopt any active account run we aren't already tracking — e.g. one
    // started on another device while this screen was parked. Returns the
    // active run (or null) so the Run guard can block a duplicate start.
    const resync = React.useCallback(async (): Promise<TAutoRun | null> => {
        if (!loginid || !automation_store) return null;

        const result = await refetch();
        const runs = result.data?.auto_list?.runs ?? [];
        const active_run =
            runs
                .filter(r => r.status === 'running' || r.status === 'paused')
                .sort((a, b) => b.start_time - a.start_time)[0] ?? null;

        if (active_run) {
            // Only (re)adopt a run we aren't already tracking — re-subscribing
            // to the same run would needlessly churn the live auto_get stream.
            if (active_run.run_id !== automation_store.active_run_id) {
                automation_store.onRunStarted(active_run);
                if (active_run.status === 'paused') automation_store.setRunStatus('paused');
                subscribeToRun(active_run.run_id);
            }
            return active_run;
        }

        // BE has no active run — clear any stale local running state.
        if (automation_store.run_status !== 'idle' && automation_store.run_status !== 'stopped') {
            const prior_run_id = automation_store.active_run_id;
            automation_store.recoverStoppedRun(prior_run_id ? runs.find(r => r.run_id === prior_run_id) : undefined);
        }
        return null;
    }, [loginid, refetch, automation_store, subscribeToRun]);

    const recover = React.useCallback(
        async (isCancelled: () => boolean = () => false) => {
            if (!loginid || !automation_store) return;

            const prior_loginid = recovered_for_loginid.current;
            if (prior_loginid && prior_loginid !== loginid) {
                unsubscribe();
            }

            automation_store.setIsRecovering(true);

            try {
                const result = await refetch();
                if (isCancelled() || !result.data) return;

                const runs = result.data.auto_list?.runs ?? [];
                const active_run = runs
                    .filter(r => r.status === 'running' || r.status === 'paused')
                    .sort((a, b) => b.start_time - a.start_time)[0];

                recovered_for_loginid.current = loginid;

                if (active_run) {
                    automation_store.onRunStarted(active_run);
                    if (active_run.status === 'paused') {
                        automation_store.setRunStatus('paused');
                    }
                    subscribeToRun(active_run.run_id);
                    return;
                }

                // No active run on BE; clear stale running state if any.
                if (automation_store.run_status === 'idle' || automation_store.run_status === 'stopped') return;

                const prior_run_id = automation_store.active_run_id;
                const stopped_run = prior_run_id ? runs.find(r => r.run_id === prior_run_id) : undefined;
                automation_store.recoverStoppedRun(stopped_run);
            } finally {
                if (!isCancelled()) automation_store.setIsRecovering(false);
            }
        },
        [loginid, refetch, unsubscribe, automation_store, subscribeToRun]
    );

    // Initial mount + loginid change.
    React.useEffect(() => {
        if (!loginid || recovered_for_loginid.current === loginid) return;
        let cancelled = false;
        recover(() => cancelled);
        return () => {
            cancelled = true;
        };
    }, [loginid, recover]);

    // WS reconnect (offline → online): deriv_api is recreated and `auto_get`
    // dies with it — re-run recovery to re-attach the subscription.
    React.useEffect(() => {
        if (!WS?.setOnReconnect) return;
        let cancelled = false;
        const handler = () => recover(() => cancelled);
        WS.setOnReconnect(handler);
        return () => {
            cancelled = true;
            WS.removeOnReconnect?.(handler);
        };
    }, [WS, recover]);

    // Tab/app regains visibility or focus: re-sync so a run started on another
    // device while this one was backgrounded shows up without a manual refresh.
    // (auto_list isn't subscribable, so this is the lightweight stand-in for a
    // real-time stream — no periodic polling.)
    React.useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') resync();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [resync]);

    return (
        <AutomationSubscriptionContext.Provider value={{ subscribeToRun, unsubscribe, resync }}>
            {children}
        </AutomationSubscriptionContext.Provider>
    );
});

export const AutomationStoreProvider = ({ children }: React.PropsWithChildren<unknown>) => {
    const { modules } = useStore();

    return (
        <AutomationStoreContext.Provider value={(modules as { automation?: AutomationStore })?.automation ?? null}>
            <AutomationSubscriptionManager>{children}</AutomationSubscriptionManager>
        </AutomationStoreContext.Provider>
    );
};

export const useAutomationStore = () => {
    const store = React.useContext(AutomationStoreContext);
    if (!store) throw new Error('useAutomationStore must be used within AutomationStoreProvider');
    return store;
};

export const useAutomationSubscription = () => {
    const ctx = React.useContext(AutomationSubscriptionContext);
    if (!ctx) throw new Error('useAutomationSubscription must be used within AutomationStoreProvider');
    return ctx;
};
