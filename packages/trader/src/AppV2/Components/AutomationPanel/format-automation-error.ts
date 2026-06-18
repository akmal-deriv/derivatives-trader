import { localize } from '@deriv-com/translations';

import { KNOWN_PARAM_KEYS } from './automation-config';

type TAutomationApiError = {
    code?: string;
    message?: string;
    details?: { field?: string; [key: string]: unknown };
};

/**
 * User-facing labels for the schema parameter keys, mirroring how they're
 * presented in the Strategy parameters / Risk management sections. Keeping
 * this map keyed off `KNOWN_PARAM_KEYS` prevents typo drift.
 */
const getParamLabels = (): Record<string, string> => ({
    [KNOWN_PARAM_KEYS.TAKE_PROFIT]: localize('Profit threshold'),
    [KNOWN_PARAM_KEYS.STOP_LOSS]: localize('Loss threshold'),
    [KNOWN_PARAM_KEYS.MULTIPLIER]: localize('Stake multiplier'),
    [KNOWN_PARAM_KEYS.UNIT]: localize('Stake increment'),
    [KNOWN_PARAM_KEYS.MAX_STAKE]: localize('Max. stake'),
    [KNOWN_PARAM_KEYS.INITIAL_STAKE]: localize('Initial stake'),
});

/**
 * Turns a dotted server field path like `strategy_parameters.take_profit`
 * into a user-facing label like `"Profit threshold"`. Known parameters use
 * the explicit label map; anything else falls back to humanising the last
 * path segment (snake_case → space + first-letter capitalisation).
 */
const fieldLabel = (field: string): string => {
    const key = field.split('.').pop() ?? field;
    const labels = getParamLabels();
    if (labels[key]) return labels[key];
    const spaced = key.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/**
 * Combines `error.details.field` with `error.message` to produce a
 * user-facing string like `"Multiplier must be > 1 and <= 10"`, falling
 * back to the raw message when no field is present.
 */
export const formatAutomationErrorMessage = (error: TAutomationApiError | null | undefined): string => {
    const message = error?.message ?? '';
    const field = error?.details?.field;
    if (field && message) {
        return `${fieldLabel(field)} ${message}`;
    }
    return message;
};
