import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { getCurrencyDisplayCode } from '@deriv/shared';
import { Localize, useTranslations } from '@deriv-com/translations';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { useDevice } from '@deriv-com/ui';

import useTradeError from 'AppV2/Hooks/useTradeError';
import { useTraderStore } from 'Stores/useTraderStores';

import TakeProfitAndStopLossInput, {
    TTakeProfitAndStopLossGate,
} from '../RiskManagement/take-profit-and-stop-loss-input';
import { TTradeParametersProps } from '../trade-parameters';

import TakeProfitDesktop from './take-profit-desktop';
import './take-profit-desktop.scss';

const TakeProfit = observer(({ is_minimized }: TTradeParametersProps) => {
    const { currency, has_open_accu_contract, has_take_profit, is_market_closed, take_profit } = useTraderStore();
    const { is_error_matching_field: has_error } = useTradeError({ error_fields: ['take_profit'] });
    const { isMobile } = useDevice();
    const { localize } = useTranslations();
    const [is_open, setIsOpen] = React.useState(false);
    // The single input lifts its commit handler + state-backed dirty gate here (this is the header owner).
    const [gate, setGate] = React.useState<TTakeProfitAndStopLossGate>();

    const onActionSheetClose = React.useCallback(() => setIsOpen(false), []);

    const is_save_disabled = !gate?.is_dirty || gate.has_blocking_error;

    // Use desktop component for desktop, ActionSheet for mobile
    if (!isMobile) {
        return <TakeProfitDesktop is_minimized={is_minimized} />;
    }

    return (
        <React.Fragment>
            <TextField
                className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                disabled={has_open_accu_contract || is_market_closed}
                label={
                    <Localize i18n_default_text='Take profit' key={`take-profit${is_minimized ? '-minimized' : ''}`} />
                }
                onClick={() => setIsOpen(true)}
                readOnly
                variant='fill'
                value={has_take_profit && take_profit ? `${take_profit} ${getCurrencyDisplayCode(currency)}` : '-'}
                status={has_error ? 'error' : 'neutral'}
            />
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onActionSheetClose}
                position='left'
                expandable={false}
                shouldBlurOnClose={is_open}
            >
                <ActionSheet.Portal showHandlebar={false} shouldDetectSwipingOnContainer shouldCloseOnDrag>
                    <ActionSheet.Header
                        title={<Localize i18n_default_text='Take profit' />}
                        closeAction={{ ariaLabel: localize('Close') }}
                        saveAction={{ onAction: () => gate?.onSave(), ariaLabel: localize('Save') }}
                        isSaveActionDisabled={is_save_disabled}
                        shouldCloseOnSaveActionClick={false}
                    />
                    <TakeProfitAndStopLossInput onActionSheetClose={onActionSheetClose} onGateChange={setGate} />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default TakeProfit;
