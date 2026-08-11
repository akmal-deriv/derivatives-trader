import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { LabelPairedChevronUpLgFillIcon } from '@deriv/quill-icons';
import { useStore } from '@deriv/stores';

import ClosedMarketMessage from 'AppV2/Components/ClosedMarketMessage';
import PurchaseButton from 'AppV2/Components/PurchaseButton';
import { isTradeParamVisible } from 'AppV2/Utils/layout-utils';
import { isSameTradeTypeCategory } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import TradeParameters from './trade-parameters';
import TradeTypeTabs from './TradeTypeTabs';

type TTradeParametersContainer = {
    is_market_closed?: boolean;
};

const SWIPE_THRESHOLD_PX = 50; // Minimum distance (px) to recognize as swipe vs tap

const TradeParametersContainer = ({ is_market_closed }: TTradeParametersContainer) => {
    const { contract_type, has_cancellation, symbol } = useTraderStore();
    const {
        ui: { is_chart_maximized },
    } = useStore();
    const [is_sheet_expanded, setIsSheetExpanded] = React.useState(false);
    const container_ref = React.useRef<HTMLDivElement>(null);
    const handle_touch_start_y = React.useRef<number>(0);
    const prev_contract_type_ref = React.useRef(contract_type);
    const is_swipe_ref = React.useRef(false);

    const toggleSheet = React.useCallback(() => {
        setIsSheetExpanded(prev => !prev);
    }, []);

    const handleSwipe = React.useCallback((direction: 'up' | 'down') => {
        if (direction === 'up') setIsSheetExpanded(true);
        else setIsSheetExpanded(false);
    }, []);

    const handlePurchaseSuccess = React.useCallback(() => {
        setIsSheetExpanded(false);
    }, []);

    // Collapse the sheet when switching to a different trade type category
    React.useEffect(() => {
        const prev_contract_type = prev_contract_type_ref.current;
        const is_same_category = isSameTradeTypeCategory(prev_contract_type, contract_type);

        if (!is_same_category) {
            setIsSheetExpanded(false);
        }

        prev_contract_type_ref.current = contract_type;
    }, [contract_type]);

    // Collapse the expanded sheet when the user taps/clicks outside of it (e.g. on the chart above).
    // Only active while expanded.
    React.useEffect(() => {
        if (!is_sheet_expanded) return undefined;

        const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || container_ref.current?.contains(target)) return;
            // A blocking overlay opened from within the params is showing — a parameter's action sheet
            // (Duration/Stake/Risk) or the risk-disclosure modal from the Buy button. An outside tap
            // (including on the overlay's own backdrop) is meant for that overlay, not to collapse the
            // trade-params sheet behind it. Both quill portals mount their root only while open, so
            // their mere presence is the signal.
            if (document.querySelector('.quill-action-sheet--root, .quill-modal__background')) return;
            // A tap directly on a transient in-place portal opened from within the params — a
            // validation snackbar (Duration/Stake errors) or a parameter tooltip — shouldn't collapse
            // the sheet either. These have no backdrop, so match the tapped element itself.
            if (target.closest('.quill-snackbar, .react-tiny-popover-container')) return;
            setIsSheetExpanded(false);
        };

        document.addEventListener('mousedown', handleOutsidePointer);
        document.addEventListener('touchstart', handleOutsidePointer);
        return () => {
            document.removeEventListener('mousedown', handleOutsidePointer);
            document.removeEventListener('touchstart', handleOutsidePointer);
        };
    }, [is_sheet_expanded]);

    return (
        <div
            ref={container_ref}
            className={clsx('trade-params__container', {
                'trade-params__container--expanded': is_sheet_expanded,
                'trade-params__container--collapsed': !is_sheet_expanded,
                'trade-params__container--chart-maximized': is_chart_maximized,
            })}
            data-testid='trade-params-container'
            onTouchStart={e => {
                handle_touch_start_y.current = e.touches[0].clientY;
                is_swipe_ref.current = false;
            }}
            onTouchEnd={e => {
                const touchEndY = e.changedTouches[0].clientY;
                const deltaY = handle_touch_start_y.current - touchEndY;

                // Only handle swipe gestures (> threshold) in touch events
                if (Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
                    is_swipe_ref.current = true;
                    e.preventDefault();
                    handleSwipe(deltaY > 0 ? 'up' : 'down');
                }
            }}
        >
            <div
                className='trade-params__container-handle'
                onClick={e => {
                    // Only handle taps in onClick (not swipes)
                    if (!is_swipe_ref.current) {
                        e.preventDefault();
                        toggleSheet();
                    }
                }}
                data-testid='trade-params-handle'
            >
                <LabelPairedChevronUpLgFillIcon
                    className='trade-params__container-handle-chevron'
                    fill='var(--component-handle-bg)'
                />
            </div>
            {isTradeParamVisible({ component_key: 'trade_type_tabs', contract_type, has_cancellation, symbol }) && (
                <div className='trade-params__container-tabs'>
                    <TradeTypeTabs />
                </div>
            )}
            <div className='trade-params__container-content'>
                <section
                    className={clsx('', {
                        'trade-params--minimized': !is_sheet_expanded,
                        'trade-params': is_sheet_expanded,
                    })}
                >
                    <TradeParameters is_minimized={!is_sheet_expanded} />
                    <ClosedMarketMessage />
                    {!is_market_closed && <PurchaseButton onPurchaseSuccess={handlePurchaseSuccess} />}
                </section>
            </div>
        </div>
    );
};

export default observer(TradeParametersContainer);
