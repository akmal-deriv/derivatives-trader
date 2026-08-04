import React from 'react';
import clsx from 'clsx';

import { trackAnalyticsEvent } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { ActionSheet } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { DURATION_TAB } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import DurationTabs from './chips';
import DayInput from './day';
import { DurationTicksWheel, DurationTimeWheel } from './duration-wheel-picker';

const DurationActionSheetContainer = observer(
    ({
        tab,
        setTab,
        selected_ticks,
        setSelectedTicks,
        selected_time,
        setSelectedTime,
        selected_expiry_time,
        selected_expiry_date,
        setSelectedExpiryTime,
        setSavedExpiryTime,
        setSelectedExpiryDate,
        setSavedExpiryDate,
    }: {
        tab: string;
        setTab: (arg: string) => void;
        selected_ticks: number;
        setSelectedTicks: (arg: number) => void;
        selected_time: number[];
        setSelectedTime: (arg: number[]) => void;
        selected_expiry_time: string;
        selected_expiry_date: string;
        setSelectedExpiryTime: (arg: string) => void;
        setSavedExpiryTime: (arg: string) => void;
        setSelectedExpiryDate: (arg: string) => void;
        setSavedExpiryDate: (arg: string) => void;
    }) => {
        const { duration_units_list, onChangeMultiple } = useTraderStore();

        const onAction = () => {
            // Save action only used for End Time (days) unit
            setSavedExpiryDate(selected_expiry_date);
            setSavedExpiryTime(selected_expiry_time);

            onChangeMultiple({
                expiry_date: `${selected_expiry_date}T${selected_expiry_time}Z`,
                expiry_time: selected_expiry_time,
                expiry_type: 'endtime',
            });
            trackAnalyticsEvent('ce_trade_types_form_v2', {
                action: 'customizing_trades',
                input_method: 'custom',
                parameter_type: 'duration',
            });
        };

        return (
            <div className='duration-container'>
                <ActionSheet.Header title={<Localize i18n_default_text='Duration' />} />
                <DurationTabs duration_units_list={duration_units_list} onChangeTab={setTab} tab={tab} />
                <div className='duration-container__tab-content'>
                    <div
                        className={clsx('duration-container__wheel', {
                            'duration-container__wheel--hidden': tab !== DURATION_TAB.TICKS,
                        })}
                        data-testid='dt_duration_ticks_wheel'
                    >
                        <DurationTicksWheel selected_ticks={selected_ticks} setSelectedTicks={setSelectedTicks} />
                    </div>
                    <div
                        className={clsx('duration-container__wheel', {
                            'duration-container__wheel--hidden': tab !== DURATION_TAB.TIME,
                        })}
                        data-testid='dt_duration_time_wheel'
                    >
                        <DurationTimeWheel selected_time={selected_time} setSelectedTime={setSelectedTime} />
                    </div>
                    {tab === DURATION_TAB.END_TIME && (
                        <div className='duration-container__endtime-tab'>
                            <DayInput
                                selected_expiry_time={selected_expiry_time}
                                selected_expiry_date={selected_expiry_date}
                                setSelectedExpiryTime={setSelectedExpiryTime}
                                setSelectedExpiryDate={setSelectedExpiryDate}
                            />
                            <ActionSheet.Footer
                                alignment='vertical'
                                primaryAction={{
                                    content: <Localize i18n_default_text='Save' />,
                                    onAction,
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

export default DurationActionSheetContainer;
