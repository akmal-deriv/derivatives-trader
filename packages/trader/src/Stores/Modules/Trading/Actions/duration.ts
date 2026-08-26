import { getDurationMinMaxValues, getExpiryType } from '@deriv/shared';

import { TTradeStore } from 'Types';

type TOnChangeExpiry = (store: TTradeStore) => {
    contract_expiry_type: string;
};
type TAssertDurationParams = Partial<
    Pick<TTradeStore, 'contract_expiry_type' | 'duration' | 'duration_min_max' | 'duration_unit'>
>;

/**
 * Re-derives `contract_expiry_type` for the pipeline. Barrier re-seeding on an expiry-type change
 * is NOT done here: it used to be triggered by this function's result differing from the store,
 * which only worked while the store's value was derived incorrectly. The trade-store reaction that
 * owns `contract_expiry_type` can see the transition directly and re-seeds there instead.
 */
export const onChangeExpiry: TOnChangeExpiry = store => ({
    contract_expiry_type: getExpiryType(store),
});

export const onChangeContractType = (store: TTradeStore) => {
    const contract_expiry_type = getExpiryType(store);

    const { duration, duration_min_max, duration_unit } = store;

    const obj_duration = assertDuration({ contract_expiry_type, duration, duration_min_max, duration_unit });

    return {
        ...obj_duration,
    };
};

const assertDuration = ({
    contract_expiry_type,
    duration,
    duration_min_max,
    duration_unit,
}: TAssertDurationParams = {}) => {
    const [min, max] = getDurationMinMaxValues(duration_min_max ?? {}, contract_expiry_type ?? '', duration_unit ?? '');

    if (Number(duration) < Number(min)) {
        return { duration: min };
    }
    if (Number(duration) > Number(max)) {
        return { duration: max };
    }
    return {};
};
