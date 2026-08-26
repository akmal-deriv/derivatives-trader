import { TContractsForSymbolResponse } from '@deriv/api';
import { cloneObject, getContractCategoriesConfig, getContractTypesConfig } from '@deriv/shared';

import { getTradeTypesList, TAvailableContract } from 'AppV2/Utils/trade-types-utils';
import { TContractTypesList } from 'Types';

type TContractsFor = NonNullable<TContractsForSymbolResponse['contracts_for']>;

/**
 * Maps a market-selection trade-type tab (e.g. Rise/Fall) to the raw API contract-type codes it
 * covers (e.g. `['CALL', 'PUT', 'CALLE', 'PUTE']`). These codes are what the `active_symbols`
 * request accepts in its `contract_type` filter, letting the server return only the symbols
 * tradeable for that tab in a single call — no per-symbol fan-out required.
 */
export const getApiContractTypesForTradeType = (trade_type: TAvailableContract): string[] => {
    const contract_types = getContractTypesConfig();
    return Array.from(new Set(trade_type.for.flatMap(key => contract_types[key]?.trade_types ?? [])));
};

/**
 * Pure re-implementation of the per-symbol `contracts_for` → available-categories reduction
 * used by `useContractsFor`, with the store side-effects stripped out. It transforms the raw
 * `contracts_for.available` list into the category config shape consumed by `getTradeTypesList`.
 *
 * Extracted so that the market-selection redesign can build a trade-type → symbols availability
 * map (fan-out over many symbols) without duplicating — or diverging from — the matching logic
 * that the single-symbol trade flow already relies on.
 */
export const getAvailableCategories = (contracts_for?: TContractsFor): TContractTypesList => {
    const available_categories = cloneObject(getContractCategoriesConfig());
    const contract_types = getContractTypesConfig();
    const available = contracts_for?.available ?? [];

    available.forEach(contract => {
        const type = Object.keys(contract_types).find(key => {
            const is_contract_type_match = contract_types[key].trade_types.indexOf(contract.contract_type ?? '') !== -1;

            // The API distinguishes Rise/Fall vs Higher/Lower by contract_category ('callput' vs 'higherlower').
            if (contract.contract_category) {
                if (contract.contract_category === 'callput' && key === 'rise_fall') return is_contract_type_match;
                if (contract.contract_category === 'higherlower' && key === 'high_low') return is_contract_type_match;
                return is_contract_type_match;
            }

            // Fallback for the older response shape.
            return (
                is_contract_type_match && (contract.contract_type !== 'PUT' || contract_types[key].barrier_count === 1)
            );
        });

        if (!type) return; // ignore unsupported contract types

        const category =
            Object.keys(available_categories).find(key => available_categories[key].categories.indexOf(type) !== -1) ??
            '';
        const sub_cats = available_categories[category]?.categories;
        if (!sub_cats) return;

        const index = (sub_cats as string[]).indexOf(type);
        if (index !== -1) {
            sub_cats[index] = { value: type, text: contract_types[type].title };
        }
    });

    return available_categories as TContractTypesList;
};

/**
 * Returns the list of trade-type values (e.g. `TRADE_TYPES.RISE_FALL`) a symbol supports, derived
 * from its `contracts_for` response. These values line up with `AVAILABLE_CONTRACTS[].for`, so a
 * trade-type tab is available for a symbol iff any of its `.for` values is in this set.
 */
export const getAvailableTradeTypeValues = (contracts_for?: TContractsFor): string[] =>
    getTradeTypesList(getAvailableCategories(contracts_for)).map(({ value }) => value);
