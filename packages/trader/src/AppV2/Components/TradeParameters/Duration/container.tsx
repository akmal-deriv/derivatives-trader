import React, { useCallback, useMemo, useState } from 'react';

import { trackAnalyticsEvent } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { ActionSheet } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import { TabSelector } from 'AppV2/Components/InputPopover';
import { getDurationPresets } from 'AppV2/Config/trade-parameter-presets';
import {
    getSymbolMarketData,
    mapContractTypeToDurationPresetKey,
    mapSymbolToMarketCategory,
} from 'AppV2/Utils/trade-params-preset-utils';
import { DURATION_UNIT } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { ChipsWithInputToggle } from '../Shared';

import DurationChips from './chips';
import DayInput from './day';
import DurationHoursInputDesktop from './duration-hours-input-desktop';
import DurationInputDesktop from './duration-input-desktop';
import DurationTicksInputDesktop from './duration-ticks-input-desktop';

const FALLBACK_TICKS = [1, 2, 3, 5, 7, 10];
const FALLBACK_SECONDS = [15, 30, 45, 60, 90, 120];
const FALLBACK_MINUTES = [1, 2, 3, 5, 10, 15];
const FALLBACK_HOURS = [1, 2, 4, 8, 12, 24];

const DurationActionSheetContainer = observer(
    ({
        unit,
        setUnit,
        onClose,
        selected_expiry_time,
        selected_expiry_date,
        setSelectedExpiryTime,
        setSavedExpiryTime,
        setSelectedExpiryDate,
        setSavedExpiryDate,
    }: {
        unit: string;
        setUnit: (arg: string) => void;
        onClose: () => void;
        selected_expiry_time: string;
        selected_expiry_date: string;
        setSelectedExpiryTime: (arg: string) => void;
        setSavedExpiryTime: (arg: string) => void;
        setSelectedExpiryDate: (arg: string) => void;
        setSavedExpiryDate: (arg: string) => void;
    }) => {
        const { duration, duration_units_list, onChangeMultiple, contract_type, symbol, active_symbols } =
            useTraderStore();

        const [activeTab, setActiveTab] = useState<'chips' | 'input'>('chips');

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

        const onChangeUnit = React.useCallback(
            (value: string) => {
                setUnit(value);
                setActiveTab('chips');
            },
            [setUnit]
        );

        const formatTickValue = useCallback((value: number) => {
            return localize('{{count}} {{tick_label}}', {
                count: value,
                tick_label: value === 1 ? localize('tick') : localize('ticks'),
            });
        }, []);

        const formatSecondsValue = useCallback((value: number) => {
            return localize('{{count}} {{second_label}}', {
                count: value,
                second_label: localize('sec'),
            });
        }, []);

        const formatMinutesValue = useCallback((value: number) => {
            return localize('{{count}} {{minute_label}}', {
                count: value,
                minute_label: localize('min'),
            });
        }, []);

        const formatHoursValue = useCallback((value: number) => {
            return localize('{{count}} hr', { count: value });
        }, []);

        const chipConfig = useMemo(() => {
            const symbolData = getSymbolMarketData(symbol, active_symbols);
            const marketCategory = mapSymbolToMarketCategory(
                symbolData?.market,
                symbolData?.submarket,
                symbolData?.symbol
            );
            const tradeTypeKey = mapContractTypeToDurationPresetKey(contract_type);

            const tickPresets = tradeTypeKey ? getDurationPresets(tradeTypeKey, marketCategory, 't') : undefined;
            const secondPresets = tradeTypeKey ? getDurationPresets(tradeTypeKey, marketCategory, 's') : undefined;
            const minutePresets = tradeTypeKey ? getDurationPresets(tradeTypeKey, marketCategory, 'm') : undefined;
            const hourPresets = tradeTypeKey ? getDurationPresets(tradeTypeKey, marketCategory, 'h') : undefined;

            const configs: Record<
                string,
                { chipValues: number[]; formatValue: (v: number) => string; inputComponent: React.ReactNode } | null
            > = {
                [DURATION_UNIT.TICKS]: {
                    chipValues: (tickPresets as number[]) || FALLBACK_TICKS,
                    formatValue: formatTickValue,
                    inputComponent: <DurationTicksInputDesktop onClose={onClose} />,
                },
                [DURATION_UNIT.SECONDS]: {
                    chipValues: (secondPresets as number[]) || FALLBACK_SECONDS,
                    formatValue: formatSecondsValue,
                    inputComponent: <DurationInputDesktop unit='s' onClose={onClose} />,
                },
                [DURATION_UNIT.MINUTES]: {
                    chipValues: (minutePresets as number[]) || FALLBACK_MINUTES,
                    formatValue: formatMinutesValue,
                    inputComponent: <DurationInputDesktop unit='m' onClose={onClose} />,
                },
                [DURATION_UNIT.HOURS]: {
                    chipValues: (hourPresets as number[]) || FALLBACK_HOURS,
                    formatValue: formatHoursValue,
                    inputComponent: <DurationHoursInputDesktop onClose={onClose} />,
                },
            };

            return configs[unit] || null;
        }, [
            unit,
            symbol,
            active_symbols,
            contract_type,
            formatTickValue,
            formatSecondsValue,
            formatMinutesValue,
            formatHoursValue,
            onClose,
        ]);

        const onChipSelect = useCallback(
            (value: number) => {
                setSavedExpiryDate(selected_expiry_date);
                setSavedExpiryTime(selected_expiry_time);
                setSelectedExpiryTime('');

                if (unit === DURATION_UNIT.HOURS) {
                    onChangeMultiple({
                        duration_unit: DURATION_UNIT.MINUTES,
                        duration: value * 60,
                        expiry_type: 'duration',
                    });
                } else {
                    onChangeMultiple({
                        duration_unit: unit,
                        duration: value,
                        expiry_type: 'duration',
                    });
                }

                trackAnalyticsEvent('ce_trade_types_form_v2', {
                    action: 'customizing_trades',
                    input_method: 'preset',
                    parameter_type: 'duration',
                    preset_value: value,
                });

                onClose();
            },
            [
                unit,
                onChangeMultiple,
                onClose,
                setSavedExpiryDate,
                setSavedExpiryTime,
                setSelectedExpiryTime,
                selected_expiry_date,
                selected_expiry_time,
            ]
        );

        const is_non_day_unit = unit !== DURATION_UNIT.DAYS;

        return (
            <div className='duration-container'>
                <DurationChips duration_units_list={duration_units_list} onChangeUnit={onChangeUnit} unit={unit} />
                {is_non_day_unit && chipConfig && (
                    <div className='duration-container__tab-selector'>
                        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
                    </div>
                )}
                {is_non_day_unit && chipConfig && (
                    <ChipsWithInputToggle
                        activeTab={activeTab}
                        chipValues={chipConfig.chipValues}
                        selectedValue={duration}
                        onSelect={onChipSelect}
                        formatValue={chipConfig.formatValue}
                        inputComponent={chipConfig.inputComponent}
                    />
                )}

                {unit === DURATION_UNIT.DAYS && (
                    <DayInput
                        selected_expiry_time={selected_expiry_time}
                        selected_expiry_date={selected_expiry_date}
                        setSelectedExpiryTime={setSelectedExpiryTime}
                        setSelectedExpiryDate={setSelectedExpiryDate}
                    />
                )}
                {unit === DURATION_UNIT.DAYS && (
                    <ActionSheet.Footer
                        alignment='vertical'
                        primaryAction={{
                            content: <Localize i18n_default_text='Save' />,
                            onAction,
                        }}
                    />
                )}
            </div>
        );
    }
);

export default DurationActionSheetContainer;
