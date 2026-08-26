import { useEffect, useRef } from 'react';
import clsx from 'clsx';

import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import useAvailableContracts from 'AppV2/Hooks/useAvailableContracts';
import { TAvailableContract } from 'AppV2/Utils/trade-types-utils';

import FireIcon from '../FireIcon';

type TTradeTypeTabs = {
    selected_id: string;
    onSelect: (contract: TAvailableContract) => void;
    is_favourites_selected: boolean;
    favourites_count: number;
    onSelectFavourites: () => void;
    /** When set (e.g. in Automate), restrict the tabs to these trade-type values. */
    supported_trade_types?: Set<string>;
};

/**
 * Horizontal top-level navigation: a leading Favourites tab (market-level, cross trade type)
 * followed by the trade types (Rise/Fall, Accumulators, …) from AVAILABLE_CONTRACTS. When
 * `supported_trade_types` is provided, only trade types in that set are shown.
 */
const TradeTypeTabs = ({
    selected_id,
    onSelect,
    is_favourites_selected,
    favourites_count,
    onSelectFavourites,
    supported_trade_types,
}: TTradeTypeTabs) => {
    const all_contracts = useAvailableContracts();
    // An empty set means "not loaded yet" (e.g. automation strategies still fetching) — show all
    // rather than nothing until the supported set arrives.
    const available_contracts = supported_trade_types?.size
        ? all_contracts.filter(contract => contract.for.some(type => supported_trade_types.has(type)))
        : all_contracts;

    // Bring the active tab into view once on open — the selected trade type can sit off-screen in the
    // horizontally-scrolled row. Guarded to fire only after the tabs render (contracts load async),
    // not on every later tab tap.
    const active_tab_ref = useRef<HTMLButtonElement>(null);
    const has_scrolled_ref = useRef(false);
    useEffect(() => {
        if (has_scrolled_ref.current || !active_tab_ref.current) return;
        has_scrolled_ref.current = true;
        active_tab_ref.current.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }, [selected_id, is_favourites_selected, available_contracts.length]);

    return (
        <div className='market-selection__trade-type-tabs' role='tablist'>
            <button
                ref={is_favourites_selected ? active_tab_ref : undefined}
                type='button'
                role='tab'
                aria-selected={is_favourites_selected}
                className={clsx('market-selection__trade-type-tab', {
                    'market-selection__trade-type-tab--active': is_favourites_selected,
                })}
                onClick={onSelectFavourites}
            >
                <Text size='md' bold={is_favourites_selected}>
                    <Localize i18n_default_text='Favourite ({{count}})' values={{ count: favourites_count }} />
                </Text>
            </button>
            {available_contracts.map(contract => {
                const is_active = !is_favourites_selected && contract.id === selected_id;
                return (
                    <button
                        key={contract.id}
                        ref={is_active ? active_tab_ref : undefined}
                        type='button'
                        role='tab'
                        aria-selected={is_active}
                        className={clsx('market-selection__trade-type-tab', {
                            'market-selection__trade-type-tab--active': is_active,
                        })}
                        onClick={() => onSelect(contract)}
                    >
                        <Text size='md' bold={is_active}>
                            {contract.tradeType}
                        </Text>
                        {contract.badge && (
                            <span className='market-selection__trade-type-tab-badge'>{contract.badge}</span>
                        )}
                        {contract.show_fire_icon && <FireIcon />}
                    </button>
                );
            })}
        </div>
    );
};

export default TradeTypeTabs;
