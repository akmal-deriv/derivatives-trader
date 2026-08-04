import { useDevice } from '@deriv-com/ui';

import MarketSelectionDesktop from './market-selection-desktop';
import MarketSelectionMobile from './market-selection-mobile';

type TMarketSelection = {
    isOpen: boolean;
    setIsOpen: (input: boolean) => void;
    /** Anchor for the desktop popover (the market-tabs "add" button). Ignored on mobile. */
    triggerRef?: React.RefObject<HTMLElement>;
    /** When set (e.g. in Automate), restrict the trade-type selector to these trade-type values. */
    supported_trade_types?: Set<string>;
};

/**
 * Entry point for the redesigned market-selection experience. Picks the device-specific shell: a
 * full-screen modal on mobile, or an anchored popover panel on desktop (which needs `triggerRef` to
 * position itself). Both shells share their browse state + commit logic via `useMarketSelection`.
 */
const MarketSelection = ({ isOpen, setIsOpen, triggerRef, supported_trade_types }: TMarketSelection) => {
    const { isMobile } = useDevice();

    if (!isMobile && triggerRef) {
        return (
            <MarketSelectionDesktop
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                triggerRef={triggerRef}
                supported_trade_types={supported_trade_types}
            />
        );
    }

    return (
        <MarketSelectionMobile isOpen={isOpen} setIsOpen={setIsOpen} supported_trade_types={supported_trade_types} />
    );
};

export default MarketSelection;
