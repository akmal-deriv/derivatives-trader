import { mapErrorMessage } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

// Splits the compound `Code(Subcode)` form (e.g. `InvalidtoBuy(PayoutLimits)`)
// into parts; plain codes yield just `{ code }`.
export const parseStopReasonCode = (raw_code = ''): { code: string; subcode?: string } => {
    const match = /^([A-Za-z]+)\(([A-Za-z]+)\)$/.exec(raw_code);
    return match ? { code: match[1], subcode: match[2] } : { code: raw_code };
};

/**
 * Localized copy for `InvalidtoBuy` subcodes whose shared-mapper templates need
 * `code_args` that `auto_get` omits (they'd otherwise render with empty gaps).
 * Mirrors `mapErrorMessage`'s switch; returns undefined for subcodes that read
 * fine straight from `mapErrorMessage`.
 */
const getInvalidToBuyMessage = (subcode: string): string | undefined => {
    switch (subcode) {
        case 'PayoutLimits':
        case 'PayoutLimitExceeded':
            return localize('The contract payout is outside the allowed limits.');
        case 'StakeLimits':
        case 'StakeLimitExceeded':
            return localize('The stake is outside the allowed limits.');
        case 'InvalidMinStake':
            return localize('The stake is below the minimum allowed.');
        case 'IncorrectStakeDecimals':
            return localize('The stake has too many decimal places.');
        case 'IncorrectPayoutDecimals':
            return localize('The payout has too many decimal places.');
        case 'MultiplierOutOfRange':
            return localize('The multiplier is outside the acceptable range.');
        case 'InvalidStopOut':
            return localize('The stop out is invalid for the current price, stake, or multiplier.');
        case 'InvalidBarrierForSpot':
            return localize('The barrier is too close to the current spot price.');
        case 'InvalidBarrierPredefined':
            return localize('The selected barrier is not available.');
        case 'IncorrectBarrierOffsetDecimals':
            return localize('The barrier offset has too many decimal places.');
        case 'DigitOutOfRange':
            return localize('The digit prediction is outside the allowed range.');
        case 'SelectedTickNumberLimits':
            return localize('The selected tick is outside the allowed range.');
        case 'LimitOrderAmountTooHigh':
            return localize('The limit order amount is above the allowed maximum.');
        case 'LimitOrderAmountTooLow':
            return localize('The limit order amount is below the allowed minimum.');
        case 'LimitOrderIncorrectDecimal':
            return localize('The limit order amount has too many decimal places.');
        case 'InvalidPayoutPerPoint':
            return localize('The selected payout per point is not available.');
        case 'ContractExpiryNotAllowed':
            return localize('The contract expiry falls within a restricted period.');
        case 'MarketIsClosed':
            return localize('This market is currently closed.');
        case 'TradingNotAvailable':
        case 'TradingSuspendedSpecificHours':
            return localize('Trading is not available at this time.');
        case 'CannotProcessContract':
            return localize('This contract could not be processed.');
        default:
            return undefined;
    }
};

export const getAutomationStopMessage = (raw_code = ''): string => {
    const { code, subcode } = parseStopReasonCode(raw_code);

    let reason = code === 'InvalidtoBuy' && subcode ? getInvalidToBuyMessage(subcode) : undefined;

    if (!reason) {
        // Param-free codes read fine straight from the shared mapper; if it can't
        // map the code either, swap its generic line for an automation-specific one.
        const mapped = mapErrorMessage({ subcode: subcode || code });
        const generic = localize('An error occurred. Please try again later.');
        reason = mapped && mapped !== generic ? mapped : localize('An unexpected error occurred.');
    }

    return `${reason} ${localize('Automation stopped.')}`;
};
