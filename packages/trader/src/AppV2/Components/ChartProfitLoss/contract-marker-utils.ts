import { TContractInfo } from '@deriv/shared';

/**
 * Marker helpers ported from `packages/core/src/Stores/Helpers/chart-markers.js`
 * (`getMarkerDirection` / `getContractTypeLabel`). Ported rather than imported because
 * `@deriv/core` depends on `@deriv/trader`, so importing it here would be circular.
 * Keeping these in sync guarantees the sheet's contract marker matches the chart's entry-spot
 * marker exactly (arrow direction/colour for directional contracts, and the E/O/T/NT/digit
 * label for digit and touch contracts).
 */

export type TMarkerDirection = 'up' | 'down';

const UP_CONTRACTS = [
    'CALL',
    'CALLE',
    'RISE',
    'HIGHER',
    'ASIANU',
    'MULTUP',
    'TURBOSLONG',
    'VANILLALONGCALL',
    'LBFLOATCALL',
    'RESETCALL',
    'RUNHIGH',
    'TICKHIGH',
    'ONETOUCH',
    'CALLSPREAD',
    'CALL_BARRIER',
    'DIGITOVER',
    'DIGITMATCH',
    'DIGITEVEN',
];

const DOWN_CONTRACTS = [
    'PUT',
    'PUTE',
    'FALL',
    'LOWER',
    'ASIAND',
    'MULTDOWN',
    'TURBOSSHORT',
    'VANILLALONGPUT',
    'LBFLOATPUT',
    'RESETPUT',
    'RUNLOW',
    'TICKLOW',
    'NOTOUCH',
    'PUTSPREAD',
    'PUT_BARRIER',
    'DIGITODD',
    'DIGITUNDER',
    'DIGITDIFF',
];

export const getContractMarkerDirection = (contract_type?: string): TMarkerDirection => {
    if (!contract_type || typeof contract_type !== 'string') return 'up';
    const type = contract_type.toUpperCase();

    if (UP_CONTRACTS.includes(type)) return 'up';
    if (DOWN_CONTRACTS.includes(type)) return 'down';

    if (/CALL|RISE|HIGHER|UP|HIGH|LONG/.test(type)) return 'up';
    if (/PUT|FALL|LOWER|DOWN|LOW|SHORT/.test(type)) return 'down';

    return 'up';
};

/**
 * Short label shown inside the marker for digit/touch contracts. Returns `null` for directional
 * contracts (Rise/Fall, Higher/Lower, Turbos, Vanillas…), signalling that an arrow should be
 * rendered instead. The predicted last digit for Over/Under and Matches/Differs comes from
 * `contract_info.barrier`.
 */
export const getContractMarkerLabel = (contract_info: TContractInfo): string | null => {
    const { contract_type } = contract_info;
    if (!contract_type || typeof contract_type !== 'string') return null;
    const type = contract_type.toUpperCase();

    const label_map: Record<string, string> = {
        ONETOUCH: 'T',
        NOTOUCH: 'NT',
        DIGITEVEN: 'E',
        DIGITODD: 'O',
        DIGITMATCH: `${contract_info.barrier}`,
        DIGITDIFF: `${contract_info.barrier}`,
        DIGITOVER: `${contract_info.barrier}`,
        DIGITUNDER: `${contract_info.barrier}`,
    };

    return label_map[type] || null;
};
