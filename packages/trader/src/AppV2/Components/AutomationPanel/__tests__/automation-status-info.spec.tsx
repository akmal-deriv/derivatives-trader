import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import { useAutomationStore } from 'Stores/useAutomationStore';

import AutomationStatusInfo, { getAutomationRunSummary } from '../automation-status-info';

jest.mock('@deriv/components', () => ({
    TooltipPortal: ({ children, message }: { children: ReactNode; message: ReactNode }) => (
        <div>
            {children}
            <div data-testid='tooltip-message'>{message}</div>
        </div>
    ),
}));

jest.mock('@deriv/quill-icons', () => ({
    LabelPairedCircleInfoMdRegularIcon: () => <svg data-testid='info-icon' />,
}));

jest.mock('@deriv/shared', () => ({
    getContractTypeDisplay: jest.fn(() => 'Rise'),
    getSymbolDisplayName: jest.fn(() => 'Volatility 100 (1s)'),
}));

jest.mock('@deriv-com/translations', () => ({
    useTranslations: jest.fn(),
    Localize: ({ i18n_default_text, values }: { i18n_default_text: string; values?: Record<string, string> }) => (
        <span>{i18n_default_text.replace(/\{\{(\w+)\}\}/g, (_match, key) => values?.[key] ?? '')}</span>
    ),
}));

jest.mock('Stores/useAutomationStore', () => ({
    useAutomationStore: jest.fn(),
}));

const STRATEGIES = [{ strategy_id: 'martingale', display_name: 'Martingale' }] as never;
// Mirrors the auto_get payload shape.
const ACTIVE_RUN = {
    run_id: '1138032',
    strategy_id: 'martingale',
    contract_template: { contract_type: 'CALL', underlying_symbol: '1HZ100V' },
} as never;

const mockUseAutomationStore = useAutomationStore as jest.Mock;

describe('getAutomationRunSummary', () => {
    it('resolves strategy, contract, and market from the auto_get payload', () => {
        expect(getAutomationRunSummary(ACTIVE_RUN, STRATEGIES)).toEqual({
            strategy: 'Martingale',
            contract: 'Rise',
            market: 'Volatility 100 (1s)',
        });
    });

    it('returns null when there is no active run', () => {
        expect(getAutomationRunSummary(null, STRATEGIES)).toBeNull();
    });

    it('returns null when the strategy is not in the descriptor list', () => {
        expect(getAutomationRunSummary(ACTIVE_RUN, [])).toBeNull();
    });
});

describe('AutomationStatusInfo', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders nothing when no run is active', () => {
        mockUseAutomationStore.mockReturnValue({
            active_run: null,
            available_strategies: STRATEGIES,
            is_running: false,
            is_paused: false,
        });
        const { container } = render(<AutomationStatusInfo />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the running summary while a run is active', () => {
        mockUseAutomationStore.mockReturnValue({
            active_run: ACTIVE_RUN,
            available_strategies: STRATEGIES,
            is_running: true,
            is_paused: false,
        });
        render(<AutomationStatusInfo />);
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        expect(screen.getByTestId('tooltip-message')).toHaveTextContent(
            'A Martingale strategy automation is running for Rise contract in Volatility 100 (1s) market.'
        );
    });

    it('shows the paused variant when paused', () => {
        mockUseAutomationStore.mockReturnValue({
            active_run: ACTIVE_RUN,
            available_strategies: STRATEGIES,
            is_running: false,
            is_paused: true,
        });
        render(<AutomationStatusInfo />);
        expect(screen.getByTestId('tooltip-message')).toHaveTextContent(
            'A Martingale strategy automation is paused for Rise contract in Volatility 100 (1s) market.'
        );
    });
});
