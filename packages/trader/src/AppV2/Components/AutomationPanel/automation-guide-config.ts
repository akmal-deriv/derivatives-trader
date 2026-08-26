import { TRADE_TYPES } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

/**
 * FE-driven copy for the AutomationGuide modal — independent of BE strategy
 * descriptors. Adding a new trade type or strategy is one entry in the getters
 * below. Strings are localized at access time (not module load) so they pick up
 * the active language.
 */

export type TGuideTradeTypeInfo = {
    /** Used in the trigger ("Automate {title}") and the modal heading. */
    title: string;
    /** Single-paragraph "What is {title}?" body. */
    description: string;
};

export type TGuideStrategyInfo = {
    /** Chip label. */
    label: string;
    /** Paragraph shown below the chip row. */
    description: string;
    /** Ordered list shown under "{N} parameters needed". */
    parameters: Array<{ label: string; description: string }>;
    /** Optional warning callout shown at the bottom of the parameters section. */
    warning?: string;
};

export const getAutomationTradeTypeInfo = (trade_type: string): TGuideTradeTypeInfo | undefined => {
    const info: Record<string, TGuideTradeTypeInfo> = {
        [TRADE_TYPES.RISE_FALL]: {
            title: localize('Rise/Fall'),
            description: localize(
                'Predict if the market price will end higher or lower than the entry spot at contract expiry.'
            ),
        },
        [TRADE_TYPES.RISE_FALL_EQUAL]: {
            title: localize('Rise/Fall'),
            description: localize(
                'Predict if the market price will end higher or lower than the entry spot at contract expiry. Includes the “equal” payout if the price ends exactly at the entry spot.'
            ),
        },
        [TRADE_TYPES.ACCUMULATOR]: {
            title: localize('Accumulators'),
            description: localize('Predict how much an index can move to potentially grow your stake at a fixed rate.'),
        },
        [TRADE_TYPES.MATCH_DIFF]: {
            title: localize('Matches/Differs'),
            description: localize(
                'Predict whether the last digit of the exit spot will match or differ from your chosen number.'
            ),
        },
        [TRADE_TYPES.OVER_UNDER]: {
            title: localize('Over/Under'),
            description: localize(
                'Predict if the last digit of the exit spot will be over or under your chosen number.'
            ),
        },
        [TRADE_TYPES.EVEN_ODD]: {
            title: localize('Even/Odd'),
            description: localize(
                'Predict if the last digit of the exit spot will be an even or odd number at contract expiry.'
            ),
        },
    };

    return info[trade_type];
};

export const getAutomationStrategyInfo = (strategy_id: string): TGuideStrategyInfo | undefined => {
    // Shared across strategies — localized once and reused.
    const initial_stake = {
        label: localize('Initial stake'),
        description: localize('The amount you place for your first trade.'),
    };
    const max_stake = {
        label: localize('Max stake'),
        description: localize('Resets your stake back to the initial stake if your next stake exceeds this amount.'),
    };
    const profit_threshold = {
        label: localize('Profit threshold'),
        description: localize('Stops the strategy if your profit reaches this amount.'),
    };
    const loss_threshold = {
        label: localize('Loss threshold'),
        description: localize('Stops the strategy if your loss reaches this amount.'),
    };

    const info: Record<string, TGuideStrategyInfo> = {
        martingale: {
            label: localize('Martingale'),
            description: localize(
                'Double down after a loss, reset after a profit. Multiplies your stake after a loss to recover funds quickly. Resets to your initial stake after a successful trade.'
            ),
            parameters: [
                initial_stake,
                {
                    label: localize('Stake multiplier'),
                    description: localize('Multiplies your stake after a loss (usually 2).'),
                },
                max_stake,
                profit_threshold,
                loss_threshold,
            ],
            warning: localize(
                'Be aware that using Martingale as your strategy can blow up fast without Max stake set.'
            ),
        },
        dalembert: {
            label: localize("D'Alembert"),
            description: localize(
                'Add a little after a loss, subtract after a profit. Adds a fixed amount to your stake after a loss, and subtracts it after a successful trade. A more gradual approach.'
            ),
            parameters: [
                initial_stake,
                {
                    label: localize('Stake increment'),
                    description: localize('The fixed unit added to your stake after a loss.'),
                },
                max_stake,
                profit_threshold,
                loss_threshold,
            ],
            warning: localize(
                "D'Alembert is more gradual than Martingale, but it still increases risk during losing streaks if no Max stake is set."
            ),
        },
    };

    return info[strategy_id];
};
