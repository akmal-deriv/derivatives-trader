import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import debounce from 'lodash.debounce';

import { DataList, DataTable } from '@deriv/components';
import { type Dayjs, initMoment, toMoment, toTitleCase } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { Localize, useTranslations } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { getArchivedStatementColumnsTemplate } from 'Constants/data-table-constants';

import ArchivedStatementFilter from '../Components/archived-statement-filter';
import { ReportsTableRowLoader } from '../Components/Elements/ContentLoader';
import EmptyTradeHistoryMessage from '../Components/empty-trade-history-message';
import PlaceholderComponent from '../Components/placeholder-component';
import type { TTransactionItem } from '../Services/archived-statement';
import { fetchArchivedStatement, fetchArchivedStatementAccounts } from '../Services/archived-statement';

const LIMIT = 100;
const SCROLL_THRESHOLD = 1500;
const SCROLL_DEBOUNCE_MS = 150;

type TArchivedStatementProps = RouteComponentProps & {
    component_icon: React.ReactElement;
};

type TGetColumnsTemplate = ReturnType<typeof getArchivedStatementColumnsTemplate>;

type TDataListCell = React.ComponentProps<typeof DataList.Cell>;

const formatTransaction = (
    transaction: TTransactionItem,
    localize: ReturnType<typeof useTranslations>['localize']
) => ({
    ...transaction,
    refid: transaction.transaction_id,
    action: localize(toTitleCase(transaction.action_type ?? '')),
    balance: transaction.balance_after || '0',
});

const ArchivedStatement = observer(({ component_icon }: TArchivedStatementProps) => {
    const { localize } = useTranslations();
    const { client, common } = useStore();
    const { currency, is_logged_in } = client;
    const { current_language } = common;
    const { isMobile } = useDevice();

    const [date_from, setDateFrom] = React.useState<number | null>(null);
    const [date_to, setDateTo] = React.useState<number>(toMoment().startOf('day').add(1, 'd').subtract(1, 's').unix());
    const [has_selected_date, setHasSelectedDate] = React.useState(false);
    const [selected_loginid, setSelectedLoginid] = React.useState<string | null>(null);
    const [account_options, setAccountOptions] = React.useState<{ text: string; value: string }[]>([]);

    const [raw_data, setRawData] = React.useState<TTransactionItem[]>([]);
    const [is_loading, setIsLoading] = React.useState(true);
    const [has_loaded_all, setHasLoadedAll] = React.useState(false);
    const [error, setError] = React.useState<string>('');
    const is_mounted_ref = React.useRef(true);

    React.useEffect(() => {
        return () => {
            is_mounted_ref.current = false;
        };
    }, []);

    React.useEffect(() => {
        initMoment(current_language);
    }, [current_language]);

    // Fetch available v1 accounts on mount
    React.useEffect(() => {
        if (!is_logged_in) return;

        fetchArchivedStatementAccounts().then(response => {
            if ('error' in response) {
                setSelectedLoginid('');
                return;
            }

            const loginids = Object.keys(response.loginids);
            const options = loginids.map(id => ({
                text: id,
                value: id,
                currency: response.loginids[id]?.[0]?.currency,
            }));
            setAccountOptions(options);
            setSelectedLoginid(loginids[0] ?? '');
        });
    }, [is_logged_in]);

    // Reset and fetch first page whenever filters change
    React.useEffect(() => {
        if (!is_logged_in || selected_loginid === null) return;

        let cancelled = false;
        setIsLoading(true);
        setError('');
        setHasLoadedAll(false);
        setRawData([]);

        fetchArchivedStatement({
            date_from,
            date_to,
            loginid: selected_loginid || undefined,
            limit: LIMIT,
            offset: 0,
        }).then(response => {
            if (cancelled) return;

            if ('error' in response) {
                if (response.error.status !== 'user_not_found') {
                    setError(response.error.message || response.error.status || 'An error occurred');
                }
            } else {
                const transactions = response.transactions || [];
                setRawData(transactions);
                setHasLoadedAll(transactions.length < LIMIT);
            }
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [is_logged_in, date_from, date_to, selected_loginid]);

    // Fetch next page — offset is derived from accumulated data length, same as statement
    const fetchNextBatch = React.useCallback(() => {
        if (has_loaded_all || is_loading) return;

        setIsLoading(true);

        fetchArchivedStatement({
            date_from,
            date_to,
            loginid: selected_loginid || undefined,
            limit: LIMIT,
            offset: raw_data.length,
        }).then(response => {
            if (!is_mounted_ref.current) return;
            if ('error' in response) {
                setHasLoadedAll(true);
            } else {
                const transactions = response.transactions || [];
                setRawData(prev => [...prev, ...transactions]);
                setHasLoadedAll(transactions.length < LIMIT);
            }
            setIsLoading(false);
        });
    }, [has_loaded_all, is_loading, date_from, date_to, selected_loginid, raw_data.length]);

    // Keep a stable ref so the debounced handler always calls the latest fetchNextBatch
    const fetchNextBatchRef = React.useRef(fetchNextBatch);
    React.useEffect(() => {
        fetchNextBatchRef.current = fetchNextBatch;
    }, [fetchNextBatch]);

    const fetchOnScroll = React.useMemo(
        () =>
            debounce((left: number) => {
                if (left < SCROLL_THRESHOLD) fetchNextBatchRef.current();
            }, SCROLL_DEBOUNCE_MS),
        []
    );

    React.useEffect(() => {
        return () => {
            fetchOnScroll.cancel();
        };
    }, [fetchOnScroll]);

    const handleScroll = React.useCallback(
        (event: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, scrollHeight, clientHeight } = event.target as HTMLElement;
            fetchOnScroll(scrollHeight - scrollTop - clientHeight);
        },
        [fetchOnScroll]
    );

    // current_language is in the deps so action labels re-translate when the user switches language.
    const data = React.useMemo(
        () => raw_data.map(transaction => formatTransaction(transaction, localize)),
        [raw_data, localize, current_language]
    );

    const is_empty = !is_loading && data.length === 0;

    const handleDateChange = (date_values: { to?: Dayjs; from?: Dayjs; is_batch?: boolean }) => {
        const { from, to, is_batch } = date_values;

        if (from) {
            setDateFrom(toMoment(from).unix());
        } else if (is_batch) {
            setDateFrom(null);
        }

        if (to) setDateTo(toMoment(to).unix());

        setHasSelectedDate(!!(from || to));
    };

    const filter_component = (
        <ArchivedStatementFilter
            accounts={account_options}
            handleDateChange={handleDateChange}
            handleLoginidChange={setSelectedLoginid}
            selectedLoginid={selected_loginid ?? ''}
        />
    );

    const columns: TGetColumnsTemplate = getArchivedStatementColumnsTemplate(currency, !isMobile);

    const columns_map = Object.fromEntries(columns.map(column => [column.col_index, column])) as Record<
        TGetColumnsTemplate[number]['col_index'],
        TGetColumnsTemplate[number]
    >;

    const mobileRowRenderer: React.ComponentProps<typeof DataList>['rowRenderer'] = ({ row }) => {
        return (
            <>
                <div className='data-list__row'>
                    <DataList.Cell row={row} column={columns_map.icon as TDataListCell['column']} />
                    <DataList.Cell row={row} column={columns_map.action_type as TDataListCell['column']} />
                </div>
                <div className='data-list__row'>
                    <DataList.Cell row={row} column={columns_map.refid as TDataListCell['column']} />
                    <DataList.Cell
                        className='data-list__row-cell--amount'
                        row={row}
                        column={columns_map.currency as TDataListCell['column']}
                    />
                </div>
                <div className='data-list__row'>
                    <DataList.Cell row={row} column={columns_map.transaction_time as TDataListCell['column']} />
                    <DataList.Cell
                        className='data-list__row-cell--amount'
                        row={row}
                        column={columns_map.amount as TDataListCell['column']}
                    />
                </div>
                <div className='data-list__row'>
                    <DataList.Cell row={row} column={columns_map.balance as TDataListCell['column']} />
                </div>
            </>
        );
    };

    const renderContent = () => {
        if (error) {
            return (
                <PlaceholderComponent
                    is_loading={false}
                    is_empty
                    has_selected_date={false}
                    empty_message_component={EmptyTradeHistoryMessage}
                    component_icon={component_icon}
                    localized_message={error}
                />
            );
        }
        if (data.length === 0) {
            return (
                <PlaceholderComponent
                    is_loading={is_loading}
                    has_selected_date={has_selected_date}
                    is_empty={is_empty}
                    empty_message_component={EmptyTradeHistoryMessage}
                    component_icon={component_icon}
                    localized_message={localize('You have no previous trade history.')}
                    localized_period_message={localize("You've made no transactions of this type during this period.")}
                />
            );
        }
        return (
            <div className='reports__content'>
                {!isMobile ? (
                    <DataTable
                        className='archived-statement'
                        data_source={data}
                        columns={columns}
                        getRowAction={() => ''}
                        getRowSize={() => 63}
                        content_loader={ReportsTableRowLoader}
                        onScroll={handleScroll}
                    >
                        <PlaceholderComponent is_loading={is_loading} />
                    </DataTable>
                ) : (
                    <DataList
                        className='archived-statement'
                        data_source={data}
                        rowRenderer={mobileRowRenderer}
                        getRowAction={() => ''}
                        row_gap={8}
                        onScroll={handleScroll}
                    >
                        <PlaceholderComponent is_loading={is_loading} />
                    </DataList>
                )}
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className='archived-statement__header'>
                <span className='archived-statement__header-text'>
                    <Localize i18n_default_text='Previous trade history before the system upgrade.' />
                </span>
                <div className='archived-statement__filter'>{filter_component}</div>
            </div>
            {renderContent()}
        </React.Fragment>
    );
});

export default withRouter(ArchivedStatement);
