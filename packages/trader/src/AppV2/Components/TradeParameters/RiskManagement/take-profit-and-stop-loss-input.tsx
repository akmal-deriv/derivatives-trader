import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { getDecimalPlaces, mapErrorMessage, trackAnalyticsEvent } from '@deriv/shared';
import { ActionSheet, CaptionText, Text, TextField, ToggleSwitch } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import ActionSheetHeaderTooltip from 'AppV2/Components/ActionSheetHeaderTooltip';
import { useProposal } from 'AppV2/Hooks/useProposal';
import useTradeError from 'AppV2/Hooks/useTradeError';
import { getCurrencySymbol } from 'AppV2/Utils/currency-utils';
import { focusAndOpenKeyboard } from 'AppV2/Utils/trade-params-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { ExpandedProposal } from 'Stores/Modules/Trading/Helpers/proposal';
import { useTraderStore } from 'Stores/useTraderStores';
import { TTradeStore } from 'Types';

// Reported up to the header owner so it can drive the single header check (state-backed dirty gate
// AND-ed with the existing blocking-error conditions). `onSave` is exposed for single-input hosts.
export type TTakeProfitAndStopLossGate = {
    is_dirty: boolean;
    has_blocking_error: boolean;
    onSave: () => void;
};

type TTakeProfitAndStopLossInputProps = {
    classname?: string;
    has_actionsheet_wrapper?: boolean;
    initial_error_text?: React.ReactNode;
    onActionSheetClose: () => void;
    onGateChange?: (gate: TTakeProfitAndStopLossGate) => void;
    parent_ref?: React.MutableRefObject<{
        has_take_profit?: boolean;
        has_stop_loss?: boolean;
        take_profit?: string;
        tp_error_text?: string;
        stop_loss?: string;
        sl_error_text?: string;
    }>;
    parent_is_api_response_received_ref?: React.MutableRefObject<boolean>;
    type?: 'take_profit' | 'stop_loss';
};

const TakeProfitAndStopLossInput = ({
    classname,
    has_actionsheet_wrapper = true,
    initial_error_text,
    onActionSheetClose,
    onGateChange,
    parent_ref,
    parent_is_api_response_received_ref,
    type = 'take_profit',
}: TTakeProfitAndStopLossInputProps) => {
    const { localize } = useTranslations();
    const trade_store = useTraderStore();
    const {
        contract_type,
        currency,
        has_take_profit,
        has_stop_loss,
        is_accumulator,
        take_profit,
        stop_loss,
        trade_types,
        trade_type_tab,
        onChangeMultiple,
        validation_params,
    } = trade_store;

    const is_take_profit_input = type === 'take_profit';
    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);

    // For tracking errors, that are coming from proposal for take profit and stop loss
    const { message } = useTradeError({ error_fields: [type] });

    // For handling cases when user clicks on Save btn before we got response from API
    const is_api_response_received = React.useRef(false);
    const is_api_response_received_ref = parent_is_api_response_received_ref || is_api_response_received;

    // `onSave` reads the ref imperatively (and the container shares one per field), but mutating a ref
    // does not re-render — so the header gate below never recomputed once the proposal landed. Mirror
    // the flag in state and always set the two together.
    const [has_api_response, setHasApiResponse] = React.useState(false);
    const setApiResponseReceived = (received: boolean) => {
        is_api_response_received_ref.current = received;
        setHasApiResponse(received);
    };

    const [is_enabled, setIsEnabled] = React.useState(is_take_profit_input ? has_take_profit : has_stop_loss);
    const [new_input_value, setNewInputValue] = React.useState(is_take_profit_input ? take_profit : stop_loss);
    const [error_text, setErrorText] = React.useState('');
    const [fe_error_text, setFEErrorText] = React.useState(initial_error_text ?? message ?? '');
    const [max_length, setMaxLength] = React.useState(10);

    // Refs for handling focusing and bluring input
    const input_ref = React.useRef<HTMLInputElement>(null);
    const focused_input_ref = React.useRef<HTMLInputElement>(null);
    const focus_timeout = React.useRef<ReturnType<typeof setTimeout>>();

    const decimals = getDecimalPlaces(currency);
    const currency_symbol = getCurrencySymbol(currency);
    const Component = has_actionsheet_wrapper ? ActionSheet.Content : 'div';

    const min_value = validation_params[contract_types[0]]?.[type]?.min;
    const max_value = validation_params[contract_types[0]]?.[type]?.max;
    // Storing data from validation params (proposal) in state in case if we got a validation error from API and proposal stop streaming
    const [info, setInfo] = React.useState<Record<string, string | undefined>>({ min_value, max_value });

    const new_values = {
        ...(is_take_profit_input ? { has_take_profit: is_enabled } : { has_stop_loss: is_enabled }),
        has_cancellation: false,
        ...(is_take_profit_input
            ? { take_profit: is_enabled ? new_input_value : '' }
            : { stop_loss: is_enabled ? new_input_value : '' }),
    };

    const { data: response, error: queryError } = useProposal({
        trade_store,
        proposal_request_values: new_values,
        contract_type: Object.keys(trade_types)[0],
        is_enabled,
        // Exclude the opposite field when validating tp/sl independently
        should_skip_validation: is_take_profit_input ? 'stop_loss' : 'take_profit',
    });

    const input_message =
        info.min_value && info.max_value ? (
            <Localize
                i18n_default_text='Range: {{min_value}} to {{max_value}}'
                values={{
                    min_value: `${currency_symbol}${info.min_value}`,
                    max_value: `${currency_symbol}${info.max_value}`,
                }}
            />
        ) : (
            ''
        );

    const updateParentRef = ({ field_name, new_value }: { field_name: string; new_value: React.ReactNode }) => {
        if (!parent_ref?.current || !field_name) return;
        parent_ref.current = { ...parent_ref.current, [field_name]: new_value };
    };

    const onToggleSwitch = (new_value: boolean) => {
        setApiResponseReceived(false);
        setIsEnabled(new_value);
        updateParentRef({ field_name: is_take_profit_input ? 'has_take_profit' : 'has_stop_loss', new_value });

        if (new_value) {
            clearTimeout(focus_timeout.current);
            focus_timeout.current = focusAndOpenKeyboard(focused_input_ref.current, input_ref.current);
        } else {
            setFEErrorText('');
            setErrorText('');
            updateParentRef({ field_name: is_take_profit_input ? 'tp_error_text' : 'sl_error_text', new_value: '' });
            input_ref.current?.blur();
        }
    };

    React.useEffect(() => {
        if (queryError) {
            const new_error = queryError ? mapErrorMessage(queryError) : '';
            const is_error_field_match = queryError?.details?.field === type || !queryError?.details?.field;
            setErrorText(is_error_field_match ? new_error : '');
            updateParentRef({
                field_name: is_take_profit_input ? 'tp_error_text' : 'sl_error_text',
                new_value: is_error_field_match ? new_error : '',
            });
            setApiResponseReceived(true);
        }

        if (response) {
            const { proposal } = response;

            // Clear errors on successful response
            setErrorText('');
            updateParentRef({
                field_name: is_take_profit_input ? 'tp_error_text' : 'sl_error_text',
                new_value: '',
            });

            // Recovery for min and max allowed values in case of error
            if (!info.min_value || !info.max_value) {
                const { min, max } = (proposal as ExpandedProposal)?.validation_params?.[type] ?? {};
                setInfo(info =>
                    (info.min_value !== min && min) || (info.max_value !== max && max)
                        ? { min_value: min, max_value: max }
                        : info
                );
            }
            setApiResponseReceived(true);
        }
    }, [is_enabled, response, queryError]);

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = String(e.target.value);
        if (value.length > 1) value = /^[0-]+$/.test(value) ? '0' : value.replace(/^0*/, '').replace(/^\./, '0.');

        // If new value is equal to previous one, then we won't send API request
        const is_equal = value === new_input_value;
        setApiResponseReceived(is_equal);
        if (is_equal) return;
        setFEErrorText('');
        setNewInputValue(value);
        updateParentRef({ field_name: type, new_value: value });
    };

    const onSave = () => {
        // Prevent from saving if user clicks before BE validation
        if (!is_api_response_received_ref.current && is_enabled) return;

        if (error_text && is_enabled) return;
        if (!new_input_value && is_enabled) {
            setFEErrorText(
                is_take_profit_input
                    ? localize('Please enter a take profit amount.')
                    : localize('Please enter a stop loss amount.')
            );
            return;
        }

        const is_tp_enabled = error_text ? false : is_enabled;
        onChangeMultiple({
            ...(is_take_profit_input ? { has_take_profit: is_tp_enabled } : { has_stop_loss: is_tp_enabled }),
            ...(is_take_profit_input
                ? {
                      take_profit: error_text || new_input_value === '0' ? '' : new_input_value,
                  }
                : {
                      stop_loss: error_text || new_input_value === '0' ? '' : new_input_value,
                  }),
            ...(is_tp_enabled ? { has_cancellation: false } : {}),
        });
        trackAnalyticsEvent('ce_trade_types_form_v2', {
            action: 'customizing_trades',
            input_method: 'custom',
            parameter_type: type,
        });
        onActionSheetClose();
    };

    // The committed value this input drafts against. Save must stay disabled until the draft differs.
    const committed_is_enabled = is_take_profit_input ? has_take_profit : has_stop_loss;
    const committed_value = is_take_profit_input ? take_profit : stop_loss;
    const is_dirty =
        is_enabled !== committed_is_enabled || (is_enabled && (new_input_value ?? '') !== (committed_value ?? ''));

    // Ref-based disable preserved from the previous footer path, now AND-ed with the dirty gate.
    const has_blocking_error = Boolean(
        (!has_api_response && is_enabled) || (error_text && is_enabled) || fe_error_text
    );

    // Surface the gate + save handler to the header owner (container for TP&SL, take-profit.tsx for
    // the standalone sheet). Runs on every relevant change so the single header check stays reactive.
    React.useEffect(() => {
        onGateChange?.({ is_dirty, has_blocking_error, onSave });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_dirty, has_blocking_error, is_enabled, new_input_value, error_text, fe_error_text, has_api_response]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (!has_blocking_error) {
                onSave();
            }
        }
    };
    React.useEffect(() => {
        setFEErrorText(initial_error_text ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial_error_text]);

    React.useEffect(() => {
        setInfo(info =>
            (info.min_value !== min_value && min_value) || (info.max_value !== max_value && max_value)
                ? { min_value, max_value }
                : info
        );
    }, [min_value, max_value]);

    React.useEffect(() => () => clearTimeout(focus_timeout.current), []);

    return (
        <React.Fragment>
            <Component className={clsx('take-profit__wrapper', classname)}>
                <div className='take-profit__content'>
                    <span className='take-profit__label'>
                        <Text>
                            {is_take_profit_input ? (
                                <Localize i18n_default_text='Take profit' />
                            ) : (
                                <Localize i18n_default_text='Stop loss' />
                            )}
                        </Text>
                        <ActionSheetHeaderTooltip
                            description={
                                is_take_profit_input ? (
                                    <Localize i18n_default_text='When your profit reaches or exceeds this amount, your trade will be closed automatically.' />
                                ) : (
                                    <Localize i18n_default_text='When your loss reaches or exceeds this amount, your trade will be closed automatically.' />
                                )
                            }
                            label={is_take_profit_input ? localize('Take profit') : localize('Stop loss')}
                        />
                    </span>
                    <ToggleSwitch checked={is_enabled} onChange={onToggleSwitch} />
                </div>
                <TextField
                    allowDecimals
                    customType='commaRemoval'
                    className='text-field--custom'
                    disabled={!is_enabled}
                    decimals={decimals}
                    data-testid={is_take_profit_input ? 'dt_tp_input' : 'dt_sl_input'}
                    inputMode='decimal'
                    id={type}
                    label={`${localize('Amount')} (${currency_symbol})`}
                    message={is_enabled && (fe_error_text || error_text || input_message)}
                    name={type}
                    noStatusIcon
                    onChange={onInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={localize('Amount')}
                    ref={input_ref}
                    regex={/[^0-9.,]/g}
                    status={fe_error_text || error_text ? 'error' : 'neutral'}
                    textAlignment='left'
                    variant='fill'
                    value={new_input_value ?? ''}
                    onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                        if (
                            ['.', ','].includes((e.nativeEvent as InputEvent)?.data ?? '') &&
                            (new_input_value?.length ?? 0) <= 10
                        ) {
                            setMaxLength(decimals ? 11 + decimals : 10);
                        } else if (!new_input_value?.includes('.')) {
                            setMaxLength(10);
                        }
                    }}
                    maxLength={max_length}
                />
                {!is_enabled && (
                    <button
                        className='take-profit__overlay'
                        data-testid='dt_take_profit_overlay'
                        onClick={() => onToggleSwitch(true)}
                    />
                )}
                {/* this input with inline styles is needed to fix a focus issue in Safari */}
                <input ref={focused_input_ref} style={{ height: 0, opacity: 0, display: 'none' }} inputMode='decimal' />
                {is_accumulator && (
                    <CaptionText color='quill-typography__color--subtle' className='take-profit__accu-information'>
                        <Localize i18n_default_text='Note: Cannot be adjusted for ongoing accumulator contracts.' />
                    </CaptionText>
                )}
            </Component>
        </React.Fragment>
    );
};

export default observer(TakeProfitAndStopLossInput);
