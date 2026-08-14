import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { CONTRACT_TYPES } from '@deriv/shared';
import { ActionSheet, CaptionText, TextField, useSnackbar } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { AutomationLockOverlay } from '../Shared';
import { TTradeParametersProps } from '../trade-parameters';

import LastDigitSelector from './last-digit-selector';

const displayed_digits = [...Array(10).keys()]; // digits array [0 - 9]

const getInvalidDigitForContractType = (trade_type_tab: string): number | null => {
    if (trade_type_tab === CONTRACT_TYPES.OVER_UNDER.OVER || trade_type_tab === 'DIGITOVER') {
        return 9; // Digit 9 is invalid for Over (can't predict over 9)
    }
    if (trade_type_tab === CONTRACT_TYPES.OVER_UNDER.UNDER || trade_type_tab === 'DIGITUNDER') {
        return 0; // Digit 0 is invalid for Under (can't predict under 0)
    }
    return null;
};

const LastDigitPrediction = observer(({ is_minimized, is_automation }: TTradeParametersProps) => {
    const store = useTraderStore();
    const {
        digit_stats = [],
        is_automation_params_locked,
        is_market_closed,
        last_digit,
        onChange,
        trade_type_tab,
    } = store;
    const [is_open, setIsOpen] = React.useState(false);
    const [selected_digit, setSelectedDigit] = React.useState(last_digit);
    const [previous_trade_type_tab, setPreviousTradeTypeTab] = React.useState(trade_type_tab);
    const { addSnackbar } = useSnackbar();
    // The automation tab lays params out vertically as fields, so render the
    // compact field here too — not the inline digit grid.
    const render_as_field = is_minimized || is_automation;

    React.useEffect(() => {
        setSelectedDigit(last_digit);
    }, [last_digit]);

    // Calculate invalid digit based on trade type tab (DIGITOVER or DIGITUNDER)
    const invalid_digit = React.useMemo(() => getInvalidDigitForContractType(trade_type_tab), [trade_type_tab]);

    // Validate initial selection and on trade type change
    React.useEffect(() => {
        const is_trade_type_changed = previous_trade_type_tab !== trade_type_tab;

        // If the currently selected digit is invalid
        if (invalid_digit !== null && last_digit === invalid_digit) {
            if (is_trade_type_changed) {
                const contract_name = trade_type_tab === CONTRACT_TYPES.OVER_UNDER.OVER ? 'Over' : 'Under';
                addSnackbar({
                    message: localize(
                        'Digit {{digit}} is not available for {{contract_name}}. Please select a different digit.',
                        {
                            digit: invalid_digit,
                            contract_name,
                        }
                    ),
                    status: 'fail',
                    hasCloseButton: true,
                    delay: ERROR_SNACKBAR_DURATION,
                });
            }

            // Auto-select a valid digit (the closest valid one)
            const new_digit = invalid_digit === 9 ? 8 : 1;
            onChange({ target: { name: 'last_digit', value: new_digit } });
        }

        if (is_trade_type_changed) {
            setPreviousTradeTypeTab(trade_type_tab);
        }
    }, [trade_type_tab, last_digit, invalid_digit, previous_trade_type_tab, onChange, addSnackbar]);

    const handleLastDigitChange = (digit: number) => {
        // Prevent selecting invalid digits
        if (digit === invalid_digit) {
            return;
        }
        onChange({ target: { name: 'last_digit', value: digit } });
    };
    const onSaveButtonClick = () => {
        if (last_digit !== selected_digit) handleLastDigitChange(selected_digit);
    };
    const onActionSheetClose = React.useCallback(() => {
        setIsOpen(false);
        setSelectedDigit(last_digit);
    }, [last_digit]);

    if (render_as_field)
        return (
            <>
                <div className='trade-params__field-locked'>
                    <TextField
                        className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                        disabled={is_market_closed || is_automation_params_locked}
                        variant='fill'
                        readOnly
                        label={
                            <Localize
                                i18n_default_text='Last digit prediction'
                                key={`last-digit-prediction${is_minimized ? '-minimized' : ''}`}
                            />
                        }
                        value={last_digit}
                        onClick={() => setIsOpen(true)}
                    />
                    {is_automation_params_locked && <AutomationLockOverlay />}
                </div>
                <ActionSheet.Root
                    isOpen={is_open}
                    onClose={onActionSheetClose}
                    position='left'
                    expandable={false}
                    shouldBlurOnClose={is_open}
                >
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content>
                            <LastDigitSelector
                                digits={displayed_digits}
                                digit_stats={digit_stats}
                                onDigitSelect={digit => {
                                    if (digit !== invalid_digit) {
                                        setSelectedDigit(digit);
                                    }
                                }}
                                selected_digit={selected_digit}
                                invalid_digit={invalid_digit}
                            />
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            className='last-digit-prediction__footer'
                            primaryAction={{
                                content: <Localize i18n_default_text='Save' />,
                                onAction: onSaveButtonClick,
                            }}
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            </>
        );

    return (
        <div
            className={clsx(
                'last-digit-prediction',
                is_market_closed && 'last-digit-prediction--disabled',
                is_automation_params_locked && 'trade-params__field-locked'
            )}
        >
            <CaptionText size='sm' className='last-digit-prediction__title'>
                <Localize i18n_default_text='Last digit prediction' />
            </CaptionText>
            <LastDigitSelector
                digits={displayed_digits}
                digit_stats={digit_stats}
                onDigitSelect={handleLastDigitChange}
                selected_digit={last_digit}
                is_disabled={is_market_closed || is_automation_params_locked}
                invalid_digit={invalid_digit}
            />
            {is_automation_params_locked && <AutomationLockOverlay />}
        </div>
    );
});

export default LastDigitPrediction;
