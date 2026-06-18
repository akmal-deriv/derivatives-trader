import { mapErrorMessage } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

// Splits the compound `Code(Subcode)` form (e.g. `InvalidtoBuy(PayoutLimits)`)
// into parts; plain codes yield just `{ code }`.
export const parseStopReasonCode = (raw_code = ''): { code: string; subcode?: string } => {
    const match = /^([A-Za-z]+)\(([A-Za-z]+)\)$/.exec(raw_code);
    return match ? { code: match[1], subcode: match[2] } : { code: raw_code };
};

// `InvalidtoBuy` subcodes whose shared-mapper copy needs `code_args` that
// `auto_get` omits (would render with empty gaps). Param-free subcodes aren't
// listed — they read fine straight from `mapErrorMessage`.
const INVALID_TO_BUY_MESSAGES: Record<string, () => string> = {
    PayoutLimits: () => localize('The contract payout is outside the allowed limits.'),
    PayoutLimitExceeded: () => localize('The contract payout is outside the allowed limits.'),
    StakeLimits: () => localize('The stake is outside the allowed limits.'),
    StakeLimitExceeded: () => localize('The stake is outside the allowed limits.'),
    InvalidMinStake: () => localize('The stake is below the minimum allowed.'),
    IncorrectStakeDecimals: () => localize('The stake has too many decimal places.'),
    IncorrectPayoutDecimals: () => localize('The payout has too many decimal places.'),
    MultiplierOutOfRange: () => localize('The multiplier is outside the acceptable range.'),
    InvalidStopOut: () => localize('The stop out is invalid for the current price, stake, or multiplier.'),
    InvalidBarrierForSpot: () => localize('The barrier is too close to the current spot price.'),
    InvalidBarrierPredefined: () => localize('The selected barrier is not available.'),
    IncorrectBarrierOffsetDecimals: () => localize('The barrier offset has too many decimal places.'),
    DigitOutOfRange: () => localize('The digit prediction is outside the allowed range.'),
    SelectedTickNumberLimits: () => localize('The selected tick is outside the allowed range.'),
    LimitOrderAmountTooHigh: () => localize('The limit order amount is above the allowed maximum.'),
    LimitOrderAmountTooLow: () => localize('The limit order amount is below the allowed minimum.'),
    LimitOrderIncorrectDecimal: () => localize('The limit order amount has too many decimal places.'),
    InvalidPayoutPerPoint: () => localize('The selected payout per point is not available.'),
    ContractExpiryNotAllowed: () => localize('The contract expiry falls within a restricted period.'),
    MarketIsClosed: () => localize('This market is currently closed.'),
    TradingNotAvailable: () => localize('Trading is not available at this time.'),
    TradingSuspendedSpecificHours: () => localize('Trading is not available at this time.'),
    CannotProcessContract: () => localize('This contract could not be processed.'),
};

// Message for an automation error stop. Curated `InvalidtoBuy` subcodes get
// param-free copy; everything else defers to `mapErrorMessage`. Suffixed with
// "Automation stopped." to match the condition-triggered snackbars.
export const getAutomationStopMessage = (raw_code = ''): string => {
    const { code, subcode } = parseStopReasonCode(raw_code);
    const invalid_to_buy_message = code === 'InvalidtoBuy' && subcode ? INVALID_TO_BUY_MESSAGES[subcode] : undefined;

    let reason: string;
    if (invalid_to_buy_message) {
        reason = invalid_to_buy_message();
    } else {
        const mapped = mapErrorMessage({ subcode: subcode || code });
        const generic = localize('An error occurred. Please try again later.');
        reason = mapped && mapped !== generic ? mapped : localize('An unexpected error occurred.');
    }

    return `${reason} ${localize('Automation stopped.')}`;
};
