import React from 'react';

import {
    fetchProfileIdentity,
    fetchRiskDisclosure,
    isRiskDisclosureError,
    isRiskFieldAccepted,
    postRiskDisclosure,
    TRiskDisclosurePostBody,
} from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';

import { RISK_DISCLOSURE_RESIDENCE } from 'AppV2/Utils/risk-disclosure-constants';

type TRiskDisclosureContext = {
    is_open: boolean;
    is_loading: boolean;
    is_fully_accepted: boolean;
    is_eligible: boolean;
    is_evaluating: boolean;
    error: Error | null;
    open: () => void;
    close: () => void;
    accept: () => Promise<void>;
};

const RiskDisclosureContext = React.createContext<TRiskDisclosureContext | null>(null);

type TProviderProps = {
    children: React.ReactNode;
};

// Per the OpenAPI spec, POST /v1/client/risk-disclosure accepts both
// `risk_disclosure` and `additional_risk_disclosure_accepted` as optional
// booleans in a single request body.
export const RiskDisclosureProvider = observer(({ children }: TProviderProps) => {
    const { client } = useStore();
    const { is_logged_in, is_virtual, loginid } = client;

    const [is_open, setIsOpen] = React.useState(false);
    const [is_loading, setIsLoading] = React.useState(false);
    const [is_fully_accepted, setIsFullyAccepted] = React.useState(false);
    const [is_eligible_residence, setIsEligibleResidence] = React.useState(false);
    const [is_evaluating, setIsEvaluating] = React.useState(false);
    const [acceptance_payload, setAcceptancePayload] = React.useState<TRiskDisclosurePostBody>({});
    const [error, setError] = React.useState<Error | null>(null);

    const evaluation_ran_for_loginid = React.useRef<string | null>(null);

    const open = React.useCallback(() => setIsOpen(true), []);

    const close = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const accept = React.useCallback(async () => {
        if (Object.keys(acceptance_payload).length === 0) return;

        setIsLoading(true);
        setError(null);

        const result = await postRiskDisclosure(acceptance_payload);

        if (isRiskDisclosureError(result)) {
            setError(new Error(result.error.message || 'Failed to update risk disclosure'));
            setIsLoading(false);
            return;
        }

        setIsFullyAccepted(true);
        setAcceptancePayload({});
        setIsLoading(false);
        close();
    }, [acceptance_payload, close]);

    React.useEffect(() => {
        evaluation_ran_for_loginid.current = null;
        setIsEligibleResidence(false);
        setIsFullyAccepted(false);
        setAcceptancePayload({});
        setError(null);

        if (!is_logged_in || !loginid || is_virtual) {
            setIsOpen(false);
            setIsEvaluating(false);
            return;
        }

        let cancelled = false;
        setIsEvaluating(true);

        const evaluate = async () => {
            try {
                const profile = await fetchProfileIdentity();
                if (cancelled || isRiskDisclosureError(profile)) return;

                const residence = (profile.data?.residence ?? '').toLowerCase();
                if (residence !== RISK_DISCLOSURE_RESIDENCE) return;

                const disclosure = await fetchRiskDisclosure();
                if (cancelled || isRiskDisclosureError(disclosure)) return;
                evaluation_ran_for_loginid.current = loginid;

                const is_risk_accepted = isRiskFieldAccepted(disclosure.risk_disclosure_accepted);
                const is_additional_accepted = isRiskFieldAccepted(disclosure.additional_risk_disclosure_accepted);
                setIsFullyAccepted(is_risk_accepted && is_additional_accepted);

                const next_payload: TRiskDisclosurePostBody = {};
                if (!is_risk_accepted) next_payload.risk_disclosure = true;
                if (!is_additional_accepted) next_payload.additional_risk_disclosure_accepted = true;
                setAcceptancePayload(next_payload);

                setIsEligibleResidence(true);
            } finally {
                if (!cancelled) setIsEvaluating(false);
            }
        };

        evaluate();

        return () => {
            cancelled = true;
        };
    }, [is_logged_in, is_virtual, loginid]);

    const value = React.useMemo<TRiskDisclosureContext>(
        () => ({
            is_open,
            is_loading,
            is_fully_accepted,
            is_eligible: is_eligible_residence,
            is_evaluating,
            error,
            open,
            close,
            accept,
        }),
        [is_open, is_loading, is_fully_accepted, is_eligible_residence, is_evaluating, error, open, close, accept]
    );

    return <RiskDisclosureContext.Provider value={value}>{children}</RiskDisclosureContext.Provider>;
});

const NOOP_VALUE: TRiskDisclosureContext = {
    is_open: false,
    is_loading: false,
    is_fully_accepted: false,
    is_eligible: false,
    is_evaluating: false,
    error: null,
    open: () => undefined,
    close: () => undefined,
    accept: async () => undefined,
};

export const useRiskDisclosure = (): TRiskDisclosureContext => {
    const ctx = React.useContext(RiskDisclosureContext);
    return ctx ?? NOOP_VALUE;
};

export default useRiskDisclosure;
