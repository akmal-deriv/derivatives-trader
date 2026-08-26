import { render } from '@testing-library/react';

import { DEFAULT_DISCOVERY_WINDOW } from 'AppV2/Utils/market-discovery-utils';

import DiscoveryWarmup from '../discovery-warmup';

const mockUseMarketDiscovery = jest.fn();
const mockUseTradeTypeSymbols = jest.fn();

jest.mock('AppV2/Hooks/useMarketDiscovery', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseMarketDiscovery(...args),
}));
jest.mock('AppV2/Hooks/useTradeTypeSymbols', () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockUseTradeTypeSymbols(...args),
}));
jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: () => ({ contract_type: 'rise_fall' }),
}));

describe('DiscoveryWarmup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseTradeTypeSymbols.mockReturnValue({ underlying_symbols: ['R_100', 'R_50'] });
        mockUseMarketDiscovery.mockReturnValue({});
    });

    it('renders nothing', () => {
        const { container } = render(<DiscoveryWarmup />);

        expect(container).toBeEmptyDOMElement();
    });

    it('warms useMarketDiscovery with the trade-type symbols and the default 5m window', () => {
        render(<DiscoveryWarmup />);

        expect(mockUseTradeTypeSymbols).toHaveBeenCalled();
        expect(mockUseMarketDiscovery).toHaveBeenCalledWith(['R_100', 'R_50'], DEFAULT_DISCOVERY_WINDOW);
    });
});
