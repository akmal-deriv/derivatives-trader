import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { TRADE_TYPES } from '@deriv/shared';
import { useDevice } from '@deriv-com/ui';

import { isTradeParamVisible } from 'AppV2/Utils/layout-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import AccumulatorsInformation from './AccumulatorsInformation';
import AllowEquals from './AllowEquals';
import Barrier from './Barrier';
import BarrierInfo from './BarrierInfo';
import Duration from './Duration';
import GrowthRate from './GrowthRate';
import LastDigitPrediction from './LastDigitPrediction';
import Multiplier from './Multiplier';
import MultipliersDealCancellationInfo from './MultipliersDealCancellationInfo';
import MultipliersExpirationInfo from './MultipliersExpirationInfo';
import MultipliersInformation from './MultipliersInformation';
import PayoutInfo from './PayoutInfo';
import PayoutPerPoint from './PayoutPerPoint';
import PayoutPerPointInfo from './PayoutPerPointInfo';
import RiskManagement from './RiskManagement';
import Stake from './Stake';
import Strike from './Strike';
import TakeProfit from './TakeProfit';
import TradeTypeTabs from './TradeTypeTabs';

export type TTradeParametersProps = { is_minimized?: boolean; is_automation?: boolean };

const TradeParameters = observer(({ is_minimized, is_automation }: TTradeParametersProps) => {
    const { contract_type, has_cancellation, symbol } = useTraderStore();
    const { isMobile } = useDevice();
    const isVisible = (component_key: string) =>
        isTradeParamVisible({ component_key, contract_type, has_cancellation, symbol });

    const scroll_container_ref = React.useRef<HTMLDivElement>(null);

    // Toggling "Allow equals" swaps contract_type between RISE_FALL and RISE_FALL_EQUAL; treat them
    // as one trade type so the scroll resets only on an actual trade-type switch, not the toggle.
    const scroll_reset_key = contract_type === TRADE_TYPES.RISE_FALL_EQUAL ? TRADE_TYPES.RISE_FALL : contract_type;

    // Reset scroll position when contract type changes with smooth animation
    React.useEffect(() => {
        if (is_minimized && scroll_container_ref.current) {
            scroll_container_ref.current.scrollTo({
                left: 0,
                behavior: 'smooth',
            });
        }
    }, [scroll_reset_key, is_minimized]);

    return (
        <div
            className={clsx(
                'trade-params__options-wrapper',
                is_minimized && 'trade-params__options-wrapper--minimized'
            )}
        >
            <div
                ref={scroll_container_ref}
                className={clsx(
                    'trade-params__options-wrapper',
                    is_minimized && 'trade-params__options-wrapper--horizontal'
                )}
            >
                {is_minimized === undefined && isVisible('trade_type_tabs') && <TradeTypeTabs />}
                {isVisible('last_digit') && (
                    <LastDigitPrediction is_minimized={is_minimized} is_automation={is_automation} />
                )}
                {isVisible('duration') && <Duration is_minimized={is_minimized} />}
                {isVisible('strike') && <Strike is_minimized={is_minimized} />}
                {isVisible('barrier') && <Barrier is_minimized={is_minimized} />}
                {isVisible('growth_rate') && <GrowthRate is_minimized={is_minimized} />}
                {isVisible('multiplier') && <Multiplier is_minimized={is_minimized} />}
                {isVisible('stake') && <Stake is_minimized={is_minimized} is_automation={is_automation} />}
                {isVisible('payout_per_point') && <PayoutPerPoint is_minimized={is_minimized} />}
                {isVisible('take_profit') && <TakeProfit is_minimized={is_minimized} />}
                {isVisible('risk_management') && <RiskManagement is_minimized={is_minimized} />}
                {isVisible('allow_equals') && <AllowEquals is_minimized={is_minimized} />}
            </div>
            {/* On responsive these below-params info rows are dropped: payout-related values are shown
                in the purchase button (Rise/Fall, Accumulators Max payout), and the rest already live
                in an action sheet (Stake: Stop out/Commission; Payout per point: Turbos barrier;
                Strike: Vanilla payout per point; Risk management: DC fee, Expires on). Desktop keeps
                the rows. */}
            {!isMobile && (
                <>
                    {isVisible('accu_info_display') && <AccumulatorsInformation />}
                    {isVisible('barrier_info') && <BarrierInfo />}
                    {isVisible('payout') && <PayoutInfo />}
                    {isVisible('payout_per_point_info') && <PayoutPerPointInfo />}
                    {isVisible('expiration') && <MultipliersExpirationInfo />}
                    {isVisible('mult_info_display') && <MultipliersDealCancellationInfo />}
                    {isVisible('multipliers_info') && <MultipliersInformation />}
                </>
            )}
        </div>
    );
});

export default TradeParameters;
