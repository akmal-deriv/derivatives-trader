import React from 'react';
import clsx from 'clsx';

import { observer } from '@deriv/stores';
import { ActionSheet } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

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
        setSelectedExpiryDate,
        onSave,
        is_save_disabled,
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
        setSelectedExpiryDate: (arg: string) => void;
        onSave: () => void;
        is_save_disabled: boolean;
    }) => {
        const { duration_units_list } = useTraderStore();
        const { localize } = useTranslations();

        return (
            <div
                className='duration-container'
                // The wheel is a vertical swipe; stop it bubbling (through the React portal tree) to the
                // trade-params sheet's swipe handler, which would otherwise open/close it unintentionally.
                onTouchStart={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
            >
                <ActionSheet.Header
                    title={<Localize i18n_default_text='Duration' />}
                    closeAction={{ ariaLabel: localize('Close') }}
                    saveAction={{ onAction: onSave, ariaLabel: localize('Save') }}
                    isSaveActionDisabled={is_save_disabled}
                    shouldCloseOnSaveActionClick
                />
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
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

export default DurationActionSheetContainer;
