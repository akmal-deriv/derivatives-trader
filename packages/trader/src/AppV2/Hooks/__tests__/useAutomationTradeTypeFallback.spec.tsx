import { renderHook } from '@testing-library/react-hooks';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import { useTraderStore } from 'Stores/useTraderStores';

import useAutomationSupportedTradeTypes from '../useAutomationSupportedTradeTypes';
import useAutomationTradeTypeFallback from '../useAutomationTradeTypeFallback';

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: jest.fn(),
}));

jest.mock('../useAutomationSupportedTradeTypes', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockUseTraderStore = useTraderStore as jest.Mock;
const mockUseSupported = useAutomationSupportedTradeTypes as jest.Mock;

const SUPPORTED = new Set<string>(['rise_fall', 'high_low']);

describe('useAutomationTradeTypeFallback', () => {
    let setActiveTradePanelTab: jest.Mock, onChange: jest.Mock, clearUrlTradeType: jest.Mock;

    const setStore = ({
        is_automation_tab = true,
        contract_type = 'rise_fall',
        url_trade_type = null,
    }: {
        is_automation_tab?: boolean;
        contract_type?: string;
        url_trade_type?: string | null;
    }) => {
        mockUseTraderStore.mockReturnValue({
            is_automation_tab,
            contract_type,
            url_trade_type,
            setActiveTradePanelTab,
            onChange,
            clearUrlTradeType,
        });
    };

    const setup = (
        store: { is_automation_tab?: boolean; contract_type?: string; url_trade_type?: string | null },
        supported = SUPPORTED
    ) => {
        setStore(store);
        mockUseSupported.mockReturnValue(supported);
        return renderHook(() => useAutomationTradeTypeFallback());
    };

    beforeEach(() => {
        setActiveTradePanelTab = jest.fn();
        onChange = jest.fn();
        clearUrlTradeType = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('steady state (manual tab switching)', () => {
        it('falls back to the first supported trade type on the automation tab with an unsupported type', () => {
            setup({ is_automation_tab: true, contract_type: 'higher_lower' });
            expect(onChange).toHaveBeenCalledWith({ target: { name: 'contract_type', value: 'rise_fall' } });
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
        });

        it('does nothing when the current trade type is supported', () => {
            setup({ is_automation_tab: true, contract_type: 'rise_fall' });
            expect(onChange).not.toHaveBeenCalled();
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
        });

        it('does nothing when not on the automation tab', () => {
            setup({ is_automation_tab: false, contract_type: 'higher_lower' });
            expect(onChange).not.toHaveBeenCalled();
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
        });

        it('does nothing while the supported set is still loading (empty)', () => {
            setup({ is_automation_tab: true, contract_type: 'higher_lower' }, new Set());
            expect(onChange).not.toHaveBeenCalled();
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
        });
    });

    describe('URL landing (store url_trade_type signal)', () => {
        it('switches to the manual Trade tab when the URL trade type is unsupported by automation', () => {
            setup({ is_automation_tab: true, contract_type: 'higher_lower', url_trade_type: 'higher_lower' });
            expect(setActiveTradePanelTab).toHaveBeenCalledWith(TRADE_PANEL_TABS.TRADE);
            // The requested trade type is preserved (not overridden), and the signal is consumed.
            expect(onChange).not.toHaveBeenCalled();
            expect(clearUrlTradeType).toHaveBeenCalled();
        });

        it('stays on manual (no override) when the URL type is unsupported and already on manual', () => {
            setup({ is_automation_tab: false, contract_type: 'higher_lower', url_trade_type: 'higher_lower' });
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
            expect(onChange).not.toHaveBeenCalled();
            // Consumed anyway: a later automation-tab entry is manual navigation.
            expect(clearUrlTradeType).toHaveBeenCalled();
        });

        it('stays on automation when the URL type is supported', () => {
            setup({ is_automation_tab: true, contract_type: 'rise_fall', url_trade_type: 'rise_fall' });
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
            expect(onChange).not.toHaveBeenCalled();
            expect(clearUrlTradeType).toHaveBeenCalled();
        });

        it('does not consume the signal while the supported set is still loading', () => {
            setup(
                { is_automation_tab: true, contract_type: 'higher_lower', url_trade_type: 'higher_lower' },
                new Set()
            );
            expect(clearUrlTradeType).not.toHaveBeenCalled();
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
        });

        it('treats a URL type the store did not apply as manual navigation (no deadlock)', () => {
            // The store keeps a different type when the URL type is unavailable on the
            // market (e.g. Gold + matches/differs) — the signal must not starve the fallback.
            setup({ is_automation_tab: true, contract_type: 'higher_lower', url_trade_type: 'match_diff' });
            expect(clearUrlTradeType).toHaveBeenCalled();
            expect(setActiveTradePanelTab).not.toHaveBeenCalled();
            expect(onChange).toHaveBeenCalledWith({ target: { name: 'contract_type', value: 'rise_fall' } });
        });

        it('does not treat a later manual switch as a URL case (one-shot)', () => {
            // Landing: URL type on automation -> switched to manual, signal consumed.
            const { rerender } = setup({
                is_automation_tab: true,
                contract_type: 'higher_lower',
                url_trade_type: 'higher_lower',
            });
            expect(setActiveTradePanelTab).toHaveBeenCalledTimes(1);
            expect(clearUrlTradeType).toHaveBeenCalled();

            // The switch lands the user on the manual tab; the store has cleared the signal.
            setStore({ is_automation_tab: false, contract_type: 'higher_lower', url_trade_type: null });
            rerender();

            // User later switches back to automation with the same unsupported type:
            // the signal is consumed, so this falls back instead of bouncing to manual.
            setStore({ is_automation_tab: true, contract_type: 'higher_lower', url_trade_type: null });
            rerender();
            expect(onChange).toHaveBeenCalledWith({ target: { name: 'contract_type', value: 'rise_fall' } });
            expect(setActiveTradePanelTab).toHaveBeenCalledTimes(1);
        });
    });
});
