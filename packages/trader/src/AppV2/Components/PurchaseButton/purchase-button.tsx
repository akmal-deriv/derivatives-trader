import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { StandaloneStopwatchRegularIcon } from '@deriv/quill-icons';
import {
    getCardLabelsV2,
    getContractTypeDisplay,
    getIndicativePrice,
    getMarketName,
    getTradeTypeName,
    hasContractEntered,
    isAccumulatorContract,
    isOpen,
    isValidToSell,
    trackAnalyticsEvent,
} from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Button, useNotifications, useSnackbar } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import RiskDisclosureModal from 'AppV2/Components/RiskDisclosureModal';
import useContractsFor from 'AppV2/Hooks/useContractsFor';
import { useRiskDisclosure } from 'AppV2/Hooks/useRiskDisclosure';
import { checkIsServiceModalError, SERVICE_ERROR } from 'AppV2/Utils/layout-utils';
import { getTradeTypeTabsList } from 'AppV2/Utils/trade-params-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import PurchaseButtonContent from './purchase-button-content';

const BASIS_STAKE = 'stake';
const BASIS_PAYOUT = 'payout';
const BASIS_NAME = 'basis';

type TPurchaseButtonProps = {
    onPurchaseSuccess?: () => void;
};

const PurchaseButton = observer(({ onPurchaseSuccess }: TPurchaseButtonProps = {}) => {
    const [loading_button_index, setLoadingButtonIndex] = React.useState<number | null>(null);
    const purchaseButtonRef = React.useRef(null);
    const sellButtonRef = React.useRef(null);
    const { localize } = useTranslations();
    const { isMobile } = useDevice();
    const { addBanner } = useNotifications();
    const { addSnackbar } = useSnackbar();
    const {
        portfolio: { all_positions, onClickSell },
        client,
        common: { services_error, setServicesError },
        ui: { is_switching_account },
    } = useStore();
    const { is_logged_in } = client;
    const { trade_types: trade_types_list } = useContractsFor();
    const risk_disclosure = useRiskDisclosure();
    const {
        is_eligible: is_risk_disclosure_eligible,
        is_fully_accepted: is_risk_disclosure_accepted,
        is_evaluating: is_risk_disclosure_evaluating,
        open: openRiskDisclosure,
    } = risk_disclosure;
    const {
        basis,
        basis_list,
        contract_type,
        currency,
        has_cancellation,
        is_accumulator,
        is_multiplier,
        is_purchase_enabled,
        is_trade_enabled_v2,
        is_turbos,
        is_vanilla_fx,
        is_vanilla,
        proposal_info,
        purchase_info,
        onHoverPurchase,
        onPurchaseV2,
        onChange,
        symbol,
        trade_type_tab,
        trade_types,
    } = useTraderStore();

    const active_accu_contract = is_accumulator
        ? all_positions.find(({ contract_info, type }) => {
              const contract_underlying = contract_info.underlying_symbol;
              return isAccumulatorContract(type) && contract_underlying === symbol && isOpen(contract_info);
          })
        : undefined;

    const has_open_accu_contract = !!active_accu_contract;
    const basis_options = React.useMemo(
        () => (basis_list.length ? basis_list.map(item => item.value) : []),
        [basis_list]
    );

    const is_high_low = /^high_low$/.test(contract_type.toLowerCase());
    const purchase_button_content_props = {
        currency,
        has_cancellation,
        has_open_accu_contract,
        is_multiplier,
        is_turbos,
        is_vanilla,
    };
    const has_no_button_content =
        is_vanilla || is_vanilla_fx || is_turbos || (is_accumulator && !has_open_accu_contract);
    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const is_valid_to_sell = active_accu_contract?.contract_info
        ? hasContractEntered(active_accu_contract.contract_info) &&
          isOpen(active_accu_contract.contract_info) &&
          isValidToSell(active_accu_contract.contract_info)
        : false;
    const current_stake =
        (is_valid_to_sell && active_accu_contract && getIndicativePrice(active_accu_contract.contract_info)) || null;
    const cardLabels = getCardLabelsV2();
    const is_modal_error = checkIsServiceModalError({ services_error });
    const is_accu_sell_disabled = !is_valid_to_sell || active_accu_contract?.is_sell_requested;

    React.useEffect(
        () => () => {
            if (is_multiplier) onHoverPurchase(false, contract_type);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const getButtonType = (index: number, trade_type: string) => {
        const tab_index = getTradeTypeTabsList(contract_type).findIndex(tab => tab.contract_type === trade_type);
        const button_index = tab_index < 0 ? index : tab_index;
        return button_index ? 'sell' : 'purchase';
    };

    const addNotificationBannerCallback = (
        params: Parameters<typeof addBanner>[0],
        contract_id: number,
        specific_contract_type: string
    ) => {
        // Track run_contract analytics event directly
        const selected_trade_type = trade_types_list.find(({ value }) => value === contract_type);
        const trade_type_name = selected_trade_type?.text || contract_type;
        const market_type_name = getMarketName(symbol) || symbol;
        const contract_type_display = getTradeTypeName(specific_contract_type) || '';

        trackAnalyticsEvent('ce_contracts_set_up_form_v2', {
            action: 'run_contract',
            trade_type_name,
            market_type_name,
            contract_id,
            contract_type: contract_type_display,
        });

        return addBanner({
            icon: (
                <StandaloneStopwatchRegularIcon
                    iconSize='sm'
                    className='trade-notification--purchase'
                    key='contract-opened'
                />
            ),
            ...params,
        });
    };

    React.useEffect(() => {
        if (is_purchase_enabled) setLoadingButtonIndex(null);
    }, [is_purchase_enabled]);

    React.useEffect(() => {
        const is_rise_fall = /^rise_fall/.test(contract_type.toLowerCase());
        const shouldSwitchToStake =
            basis === BASIS_PAYOUT && basis_options.length > 1 && basis_options.includes(BASIS_STAKE) && !is_rise_fall;
        if (shouldSwitchToStake) {
            onChange({ target: { value: BASIS_STAKE, name: BASIS_NAME } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basis, basis_options, contract_type]);

    const last_shown_error_ref = React.useRef<string | null>(null);

    React.useEffect(() => {
        // Only check errors for the currently displayed contract types (filtered by trade_type_tab)
        // to avoid showing errors from non-displayed contract types (e.g., stale DIGITOVER error on Under tab)
        if (proposal_info && contract_types.length > 0) {
            let message = '';
            const has_error = contract_types.some(type => {
                const info = proposal_info[type];
                // Exclude MarketIsClosed errors - already handled by ClosedMarketMessage component
                if (info?.has_error && info?.message && info?.error_code !== 'MarketIsClosed') {
                    message = info.message || '';
                    return true;
                }
                return false;
            });

            if (has_error && message && message !== last_shown_error_ref.current) {
                last_shown_error_ref.current = message;
                addSnackbar({
                    message,
                    status: 'fail',
                    hasCloseButton: true,
                    hasFixedHeight: false,
                    style: {
                        marginBottom: is_logged_in ? '48px' : '-8px',
                        width: 'calc(100% - var(--core-spacing-800))',
                    },
                });
            } else if (!has_error) {
                last_shown_error_ref.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proposal_info]);

    const should_show_review_disclosure = is_risk_disclosure_eligible && !is_risk_disclosure_accepted;

    // While the disclosure-eligibility API is in flight, show a skeleton so we
    // don't flash Buy before swapping to Review.
    if (is_risk_disclosure_evaluating) {
        return (
            <div
                className={clsx('purchase-button__wrapper', {
                    'purchase-button__wrapper__un-auth': !is_logged_in,
                })}
            >
                <Skeleton className='purchase-button__skeleton' height={48} borderRadius={28} />
            </div>
        );
    }

    if (should_show_review_disclosure) {
        return (
            <>
                <div
                    className={clsx('purchase-button__wrapper', {
                        'purchase-button__wrapper__un-auth': !is_logged_in,
                    })}
                >
                    <Button
                        variant='secondary'
                        color='black-white'
                        size='lg'
                        label={localize('Review risk disclosure')}
                        fullWidth
                        className='purchase-button--review-disclosure'
                        onClick={openRiskDisclosure}
                    />
                </div>
                <RiskDisclosureModal
                    is_open={risk_disclosure.is_open}
                    is_loading={risk_disclosure.is_loading}
                    is_fully_accepted={risk_disclosure.is_fully_accepted}
                    error={risk_disclosure.error}
                    onClose={risk_disclosure.close}
                    onAccept={risk_disclosure.accept}
                />
            </>
        );
    }

    return (
        <React.Fragment>
            {has_open_accu_contract ? (
                <div className='purchase-button__wrapper'>
                    <Button
                        color='black-white'
                        size='lg'
                        label={
                            is_accu_sell_disabled
                                ? `${cardLabels.CLOSE}`
                                : `${cardLabels.CLOSE} ${current_stake} ${currency}`
                        }
                        fullWidth
                        isOpaque
                        isLoading={active_accu_contract?.is_sell_requested}
                        className='purchase-button purchase-button--single'
                        disabled={!is_valid_to_sell}
                        onClick={() => onClickSell(active_accu_contract?.contract_info.contract_id)}
                    />
                </div>
            ) : (
                <div
                    ref={purchaseButtonRef}
                    className={clsx('purchase-button__wrapper', {
                        'purchase-button__wrapper__un-auth': !is_logged_in,
                    })}
                >
                    {contract_types.map((trade_type, index) => {
                        const info = proposal_info?.[trade_type] || {};
                        const is_single_button = contract_types.length === 1;
                        const is_loading = loading_button_index === index;
                        const is_insufficient_balance =
                            (info.has_error && info.error_code === SERVICE_ERROR.INSUFFICIENT_BALANCE) ||
                            (purchase_info as Record<string, any>)?.error?.code === SERVICE_ERROR.INSUFFICIENT_BALANCE;
                        const is_disabled =
                            !is_trade_enabled_v2 ||
                            (info.has_error && !is_insufficient_balance) ||
                            (!!purchase_info.error && !is_modal_error && !is_insufficient_balance) ||
                            is_switching_account;
                        const is_button_disabled = is_disabled && !is_loading;

                        return (
                            <React.Fragment key={trade_type}>
                                <Button
                                    color={getButtonType(index, trade_type)}
                                    size='lg'
                                    label={
                                        is_single_button
                                            ? localize('Buy')
                                            : getContractTypeDisplay(trade_type, {
                                                  isHighLow: is_high_low,
                                                  showButtonName: true,
                                              })
                                    }
                                    fullWidth
                                    className={clsx(
                                        'purchase-button',
                                        is_loading && 'purchase-button--loading',
                                        is_single_button && 'purchase-button--single'
                                    )}
                                    isLoading={is_loading}
                                    isOpaque
                                    disabled={is_button_disabled}
                                    onMouseEnter={() => {
                                        if (isMobile || !is_multiplier || is_button_disabled) return;
                                        onHoverPurchase(true, trade_type);
                                    }}
                                    onMouseLeave={() => {
                                        if (isMobile || !is_multiplier) return;
                                        onHoverPurchase(false, trade_type);
                                    }}
                                    onClick={() => {
                                        if (is_insufficient_balance) {
                                            const error =
                                                (purchase_info as Record<string, any>)?.error ||
                                                (info.has_error && {
                                                    code: SERVICE_ERROR.INSUFFICIENT_BALANCE,
                                                    message: info.message,
                                                    type: 'buy',
                                                });
                                            if (error) {
                                                setServicesError(error, true);
                                                return;
                                            }
                                        }
                                        setLoadingButtonIndex(index);
                                        onPurchaseV2(trade_type, isMobile, (params, contract_id) => {
                                            addNotificationBannerCallback(params, contract_id, trade_type);
                                            onPurchaseSuccess?.();
                                        });
                                    }}
                                >
                                    {!is_loading && (
                                        <PurchaseButtonContent
                                            {...purchase_button_content_props}
                                            has_no_button_content={has_no_button_content}
                                            info={info}
                                            is_reverse={!!index}
                                        />
                                    )}
                                </Button>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </React.Fragment>
    );
});

export default PurchaseButton;
