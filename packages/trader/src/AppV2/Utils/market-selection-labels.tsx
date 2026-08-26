import { ReactNode } from 'react';

import { Localize } from '@deriv-com/translations';

import { getSubgroupDisplayName, getSubmarketDisplayName } from 'AppV2/Utils/symbol-categories-utils';

// Reactive, localized display labels for the market taxonomy shown in the selector's list, favourites
// and search views. These mirror the plain-string maps in symbol-categories-utils (which stay strings
// for the chart adapter and sort comparators), but render via <Localize> so a heading re-localizes the
// instant a newly-selected language's resources load — instead of freezing whatever string a grouping
// memo computed last. Any key not listed falls back to the raw key, identical to the string helpers.

const MARKET_LABELS: Record<string, ReactNode> = {
    forex: <Localize i18n_default_text='Forex' />,
    synthetic_index: <Localize i18n_default_text='Derived' />,
    cryptocurrency: <Localize i18n_default_text='Cryptocurrencies' />,
    commodities: <Localize i18n_default_text='Commodities' />,
    stock_index: <Localize i18n_default_text='Stock indices' />,
    indices: <Localize i18n_default_text='Stock indices' />,
    basket_index: <Localize i18n_default_text='Basket indices' />,
};

const SUBGROUP_LABELS: Record<string, ReactNode> = {
    synthetics: <Localize i18n_default_text='Synthetics' />,
    baskets: <Localize i18n_default_text='Baskets' />,
    major_pairs: <Localize i18n_default_text='Major pairs' />,
    minor_pairs: <Localize i18n_default_text='Minor pairs' />,
    smart_fx: <Localize i18n_default_text='Smart FX' />,
    metals: <Localize i18n_default_text='Metals' />,
    energy: <Localize i18n_default_text='Energy' />,
    americas: <Localize i18n_default_text='Americas' />,
    asia_oceania: <Localize i18n_default_text='Asia/Oceania' />,
    europe_africa: <Localize i18n_default_text='Europe/Africa' />,
};

const SUBMARKET_LABELS: Record<string, ReactNode> = {
    major_pairs: <Localize i18n_default_text='Major pairs' />,
    minor_pairs: <Localize i18n_default_text='Minor pairs' />,
    smart_fx: <Localize i18n_default_text='Smart FX' />,
    random_index: <Localize i18n_default_text='Volatility indices' />,
    random_daily: <Localize i18n_default_text='Daily reset indices' />,
    crash_boom: <Localize i18n_default_text='Crash/Boom' />,
    crash_index: <Localize i18n_default_text='Crash/Boom' />,
    step_indices: <Localize i18n_default_text='Step indices' />,
    step_index: <Localize i18n_default_text='Step indices' />,
    range_index: <Localize i18n_default_text='Range break indices' />,
    jump_indices: <Localize i18n_default_text='Jump indices' />,
    jump_index: <Localize i18n_default_text='Jump indices' />,
    cryptocurrency: <Localize i18n_default_text='Cryptocurrencies' />,
    non_stable_coin: <Localize i18n_default_text='Cryptocurrencies' />,
    metals: <Localize i18n_default_text='Metals' />,
    energy: <Localize i18n_default_text='Energy' />,
    americas: <Localize i18n_default_text='Americas' />,
    americas_OTC: <Localize i18n_default_text='American indices' />,
    asia_oceania: <Localize i18n_default_text='Asia/Oceania' />,
    asia_oceania_OTC: <Localize i18n_default_text='Asian indices' />,
    europe_africa: <Localize i18n_default_text='Europe/Africa' />,
    europe_OTC: <Localize i18n_default_text='European indices' />,
    otc_index: <Localize i18n_default_text='OTC indices' />,
    basket_forex: <Localize i18n_default_text='Forex basket' />,
    forex_basket: <Localize i18n_default_text='Forex basket' />,
    basket_commodities: <Localize i18n_default_text='Commodities basket' />,
    commodity_basket: <Localize i18n_default_text='Commodities basket' />,
    basket_cryptocurrency: <Localize i18n_default_text='Cryptocurrency basket' />,
};

export const getMarketLabel = (market: string): ReactNode => MARKET_LABELS[market] ?? market;

// Mirrors getSubgroupDisplayName: the 'none' subgroup falls back to the market label.
export const getSubgroupLabel = (subgroup: string, market: string): ReactNode =>
    subgroup === 'none' ? getMarketLabel(market) : (SUBGROUP_LABELS[subgroup] ?? subgroup);

export const getSubmarketLabel = (submarket: string): ReactNode => SUBMARKET_LABELS[submarket] ?? submarket;

// The favourites list titles each group "Subgroup (Submarket)", but collapses to just the submarket
// when the subgroup adds nothing (empty, or the same display name — e.g. Forex's Major pairs renders as
// "Major pairs", not "Major pairs (Major pairs)"). The decision is made on the plain-string names, so
// it is a language-stable boolean; the two parts still render via the reactive <Localize> maps above.
export const showsSubgroupPrefix = (subgroup: string, submarket: string, market: string): boolean => {
    const subgroup_name = getSubgroupDisplayName(subgroup, market);
    return Boolean(subgroup_name) && subgroup_name !== getSubmarketDisplayName(submarket);
};

/** The reactive "Subgroup (Submarket)" heading for a favourites group (see showsSubgroupPrefix). */
export const FavouriteSubgroupTitle = ({
    subgroup,
    submarket,
    market,
}: {
    subgroup: string;
    submarket: string;
    market: string;
}) =>
    showsSubgroupPrefix(subgroup, submarket, market) ? (
        <>
            {getSubgroupLabel(subgroup, market)} ({getSubmarketLabel(submarket)})
        </>
    ) : (
        <>{getSubmarketLabel(submarket)}</>
    );
