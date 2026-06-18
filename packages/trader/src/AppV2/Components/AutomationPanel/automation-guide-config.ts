import { TRADE_TYPES } from '@deriv/shared';

/**
 * FE-driven copy for the AutomationGuide modal — independent of BE strategy
 * descriptors. Adding a new trade type or strategy is one entry here.
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

export const AUTOMATION_TRADE_TYPE_INFO: Record<string, TGuideTradeTypeInfo> = {
    [TRADE_TYPES.RISE_FALL]: {
        title: 'Rise/Fall',
        description: 'Predict if the market price will end higher or lower than the entry spot at contract expiry.',
    },
    [TRADE_TYPES.RISE_FALL_EQUAL]: {
        title: 'Rise/Fall',
        description:
            'Predict if the market price will end higher or lower than the entry spot at contract expiry. Includes the “equal” payout if the price ends exactly at the entry spot.',
    },
    [TRADE_TYPES.ACCUMULATOR]: {
        title: 'Accumulators',
        description: 'Predict how much an index can move to potentially grow your stake at a fixed rate.',
    },
    [TRADE_TYPES.MATCH_DIFF]: {
        title: 'Matches/Differs',
        description: 'Predict whether the last digit of the exit spot will match or differ from your chosen number.',
    },
    [TRADE_TYPES.OVER_UNDER]: {
        title: 'Over/Under',
        description: 'Predict if the last digit of the exit spot will be over or under your chosen number.',
    },
    [TRADE_TYPES.EVEN_ODD]: {
        title: 'Even/Odd',
        description: 'Predict if the last digit of the exit spot will be an even or odd number at contract expiry.',
    },
};

export const AUTOMATION_STRATEGY_INFO: Record<string, TGuideStrategyInfo> = {
    martingale: {
        label: 'Martingale',
        description:
            'Double down after a loss, reset after a profit. Multiplies your stake after a loss to recover funds quickly. Resets to your initial stake after a successful trade.',
        parameters: [
            { label: 'Initial stake', description: 'The amount you place for your first trade.' },
            { label: 'Stake multiplier', description: 'Multiplies your stake after a loss (usually 2).' },
            {
                label: 'Max stake',
                description: 'Resets your stake back to the initial stake if your next stake exceeds this amount.',
            },
            { label: 'Profit threshold', description: 'Stops the strategy if your profit reaches this amount.' },
            { label: 'Loss threshold', description: 'Stops the strategy if your loss reaches this amount.' },
        ],
        warning: 'Be aware that using Martingale as your strategy can blow up fast without Max stake set.',
    },
    dalembert: {
        label: "D'Alembert",
        description:
            'Add a little after a loss, subtract after a profit. Adds a fixed amount to your stake after a loss, and subtracts it after a successful trade. A more gradual approach.',
        parameters: [
            { label: 'Initial stake', description: 'The amount you place for your first trade.' },
            { label: 'Stake increment', description: 'The fixed unit added to your stake after a loss.' },
            {
                label: 'Max stake',
                description: 'Resets your stake back to the initial stake if your next stake exceeds this amount.',
            },
            { label: 'Profit threshold', description: 'Stops the strategy if your profit reaches this amount.' },
            { label: 'Loss threshold', description: 'Stops the strategy if your loss reaches this amount.' },
        ],
        warning:
            "D'Alembert is more gradual than Martingale, but it still increases risk during losing streaks if no Max stake is set.",
    },
};

export const getAutomationTradeTypeInfo = (trade_type: string): TGuideTradeTypeInfo | undefined =>
    AUTOMATION_TRADE_TYPE_INFO[trade_type];

export const getAutomationStrategyInfo = (strategy_id: string): TGuideStrategyInfo | undefined =>
    AUTOMATION_STRATEGY_INFO[strategy_id];
