import React from 'react';

import { Loading } from '@deriv/components';
import { TReportsStore, useReportsStore } from '@deriv/reports/src/Stores/useReportsStores';
import { TContractInfo } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { TPortfolioPosition } from '@deriv/stores/types';

import { ContractCardList, ContractCardsSections } from 'AppV2/Components/ContractCard';
import { EmptyPositions, TEmptyPositionsProps } from 'AppV2/Components/EmptyPositions';
import { ContractTypeFilter, TimeFilter, TradeModeFilter } from 'AppV2/Components/Filter';
import TotalProfitLoss from 'AppV2/Components/TotalProfitLoss';
import useAvailableContracts from 'AppV2/Hooks/useAvailableContracts';
import useIsAutomationEnabled from 'AppV2/Hooks/useIsAutomationEnabled';
import useIsEuAccount from 'AppV2/Hooks/useIsEuAccount';
import useTimeFilter from 'AppV2/Hooks/useTimeFilter';
import useTradeModeFilter from 'AppV2/Hooks/useTradeModeFilter';
import useTradeTypeFilter from 'AppV2/Hooks/useTradeTypeFilter';
import { CONTRACT_LIST } from 'AppV2/Utils/trade-types-utils';

import { filterByTradeMode, filterPositions, getTotalPositionsProfit, TAB_NAME } from '../../Utils/positions-utils';

type TPositionsContentProps = Omit<TEmptyPositionsProps, 'noMatchesFound'> & {
    hasButtonsDemo?: boolean;
    setHasButtonsDemo?: React.Dispatch<React.SetStateAction<boolean>>;
};

export type TClosedPosition = {
    contract_info: TReportsStore['profit_table']['data'][number];
};

const PositionsContent = observer(({ hasButtonsDemo, isClosedTab, setHasButtonsDemo }: TPositionsContentProps) => {
    const { contractTypeFilter, setContractTypeFilter } = useTradeTypeFilter({ isClosedTab });
    const { timeFilter, setTimeFilter, customTimeRangeFilter, setCustomTimeRangeFilter } = useTimeFilter();
    const available_contracts = useAvailableContracts();
    const { is_eu, is_ready: is_eu_account_ready } = useIsEuAccount();
    const { tradeModeFilter, setTradeModeFilter } = useTradeModeFilter();
    const is_automation_enabled = useIsAutomationEnabled();
    const [filteredPositions, setFilteredPositions] = React.useState<(TPortfolioPosition | TClosedPosition)[]>([]);
    const [noMatchesFound, setNoMatchesFound] = React.useState(false);

    const { common, client, portfolio, ui } = useStore();
    const { server_time = undefined } = isClosedTab ? {} : common; // Server time is required only to update cards timers in Open positions
    const { currency } = client;
    const { is_switching_account } = ui;
    const {
        active_positions,
        is_active_empty,
        is_loading,
        onClickCancel,
        onClickSell,
        onMount: onOpenTabMount,
    } = portfolio;
    const {
        clearTable,
        data,
        fetchNextBatch: fetchMoreClosedPositions,
        handleScroll,
        handleDateChange,
        is_empty,
        is_loading: isFetchingClosedPositions,
        onMount: onClosedTabMount,
        onUnmount: onClosedTabUnmount,
    } = useReportsStore().profit_table;
    const closedPositions = React.useMemo(() => data.map(d => ({ contract_info: d })), [data]);
    const positions = React.useMemo(
        () => (isClosedTab ? closedPositions : active_positions),
        [active_positions, isClosedTab, closedPositions]
    );
    // EU accounts can only trade Multipliers, so the Open-positions trade-type filter would
    // contain a single option. Collapse the list for EU and hide the filter entirely whenever
    // there is at most one trade type available to filter by (it adds no value at that point).
    const contractTypeFilterOptions = React.useMemo(
        () => (is_eu ? available_contracts.filter(({ id }) => id === CONTRACT_LIST.MULTIPLIERS) : available_contracts),
        [available_contracts, is_eu]
    );
    const shouldShowContractTypeFilter = is_eu_account_ready && contractTypeFilterOptions.length > 1;
    const hasNoActiveFilters = isClosedTab
        ? !timeFilter && !customTimeRangeFilter && !contractTypeFilter.length && !tradeModeFilter
        : !contractTypeFilter.length;
    const hasNoPositions = hasNoActiveFilters && (isClosedTab ? is_empty : is_active_empty);
    const shouldShowEmptyMessage = hasNoPositions || noMatchesFound;
    const shouldShowContractCards =
        !!filteredPositions.length && (isClosedTab || (filteredPositions[0]?.contract_info as TContractInfo)?.status);
    const shouldShowLoading = isClosedTab
        ? isFetchingClosedPositions && !filteredPositions.length
        : is_loading || is_switching_account;
    const shouldShowTakeProfit = !isClosedTab || !!(timeFilter || customTimeRangeFilter);

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isClosedTab) handleScroll(e, true);
    };

    const contractCards = isClosedTab ? (
        <ContractCardsSections
            currency={currency}
            positions={filteredPositions as TClosedPosition[]}
            isLoadingMore={isFetchingClosedPositions}
            hasBottomMargin={shouldShowTakeProfit}
        />
    ) : (
        <ContractCardList
            currency={currency}
            hasButtonsDemo={hasButtonsDemo}
            onClickCancel={isClosedTab ? undefined : onClickCancel}
            onClickSell={isClosedTab ? undefined : onClickSell}
            positions={filteredPositions}
            setHasButtonsDemo={setHasButtonsDemo}
            serverTime={server_time}
        />
    );

    const onApplyContractTypeFilter = (filters: string[] | []) => {
        setContractTypeFilter(filters);
        if (isClosedTab) {
            clearTable();
            fetchMoreClosedPositions(true);
        }
    };

    React.useEffect(() => {
        const result = filterPositions(positions, contractTypeFilter);
        const mode_filtered = isClosedTab ? filterByTradeMode(result, tradeModeFilter) : result;
        if (contractTypeFilter.length) {
            setFilteredPositions(mode_filtered);
            if (!isClosedTab) setNoMatchesFound(!mode_filtered.length);
        } else {
            setNoMatchesFound(false);
            setFilteredPositions(mode_filtered);
        }
        if (isClosedTab)
            setNoMatchesFound(
                !mode_filtered.length &&
                    !!(timeFilter || customTimeRangeFilter || contractTypeFilter.length || tradeModeFilter)
            );
    }, [isClosedTab, positions, contractTypeFilter, timeFilter, customTimeRangeFilter, tradeModeFilter]);

    React.useEffect(() => {
        isClosedTab ? onClosedTabMount(true) : onOpenTabMount();

        return () => {
            if (isClosedTab) {
                clearTable();
                onClosedTabUnmount();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (shouldShowLoading || (!shouldShowContractCards && !shouldShowEmptyMessage))
        return <Loading.DTraderV2 is_positions is_closed_tab={isClosedTab} />;
    return (
        <div
            className={`positions-page-container__${isClosedTab ? TAB_NAME.CLOSED.toLowerCase() : TAB_NAME.OPEN.toLowerCase()}`}
            onScroll={isClosedTab ? onScroll : undefined}
        >
            {!hasNoPositions && (isClosedTab || shouldShowContractTypeFilter) && (
                <div className='positions-page-container__filter__wrapper'>
                    {isClosedTab ? (
                        <React.Fragment>
                            <TimeFilter
                                timeFilter={timeFilter}
                                setTimeFilter={setTimeFilter}
                                handleDateChange={handleDateChange}
                                customTimeRangeFilter={customTimeRangeFilter}
                                setCustomTimeRangeFilter={setCustomTimeRangeFilter}
                                setNoMatchesFound={setNoMatchesFound}
                            />
                            {is_automation_enabled && (
                                <TradeModeFilter
                                    tradeModeFilter={tradeModeFilter}
                                    setTradeModeFilter={setTradeModeFilter}
                                />
                            )}
                        </React.Fragment>
                    ) : (
                        <ContractTypeFilter
                            availableContracts={contractTypeFilterOptions}
                            contractTypeFilter={contractTypeFilter}
                            onApplyContractTypeFilter={onApplyContractTypeFilter}
                        />
                    )}
                </div>
            )}
            {shouldShowEmptyMessage ? (
                <EmptyPositions isClosedTab={isClosedTab} noMatchesFound={noMatchesFound} />
            ) : (
                shouldShowContractCards && (
                    <React.Fragment>
                        {shouldShowTakeProfit && (
                            <TotalProfitLoss
                                positionsCount={filteredPositions.length}
                                currency={currency}
                                hasBottomAlignment={isClosedTab}
                                totalProfitLoss={getTotalPositionsProfit(filteredPositions)}
                            />
                        )}
                        {contractCards}
                    </React.Fragment>
                )
            )}
        </div>
    );
});

export default PositionsContent;
