import { observer } from 'mobx-react-lite';

import useMarketDiscovery from 'AppV2/Hooks/useMarketDiscovery';
import useTradeTypeSymbols from 'AppV2/Hooks/useTradeTypeSymbols';
import { DEFAULT_DISCOVERY_WINDOW } from 'AppV2/Utils/market-discovery-utils';
import { getTradeTypeForContractType } from 'AppV2/Utils/market-selection-utils';
import { AVAILABLE_CONTRACTS } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * Headless: warms the Featured-view `ticks_history` fan-out so the onboarding tour's Market Selection
 * step (which opens the selector and mounts DiscoveryView) hits a warm React Query cache instead of a
 * cold 10-20s fan-out. Mounted only while the tour runs; renders nothing.
 *
 * Mirrors DiscoveryView's inputs exactly — same default trade type as the selector
 * (`getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0]`), the full symbol list, and
 * the '5m' window — so the per-symbol query keys match and dedupe. The symbol list is already cached
 * at page load, so this only triggers the tick fan-out.
 */
const DiscoveryWarmup = observer(() => {
    const { contract_type } = useTraderStore();
    const selected_trade_type = getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0];
    const { underlying_symbols } = useTradeTypeSymbols(selected_trade_type);
    useMarketDiscovery(underlying_symbols, DEFAULT_DISCOVERY_WINDOW);
    return null;
});

export default DiscoveryWarmup;
