import { useEffect, useRef } from 'react';

import { trackMarketCategoryTabClicked } from '@deriv/shared';
import { Chip, Text } from '@deriv-com/quill-ui';

import { TMarketCategory } from 'AppV2/Utils/market-selection-utils';

type TMarketCategoryChips = {
    categories: TMarketCategory[];
    selected_id: string;
    onSelect: (category_id: string) => void;
};

/**
 * The category-chip row (Featured, Favourites, Derived, Forex, Stocks & indices, …) that scopes the
 * list within the selected trade type.
 */
const MarketCategoryChips = ({ categories, selected_id, onSelect }: TMarketCategoryChips) => {
    // Bring the selected chip into view once on open — it can sit off-screen in the scrolled row.
    // Chips are direct children of the container, so index the DOM node rather than ref each Chip.
    const container_ref = useRef<HTMLDivElement>(null);
    const has_scrolled_ref = useRef(false);
    useEffect(() => {
        if (has_scrolled_ref.current) return;
        const index = categories.findIndex(category => category.id === selected_id);
        const chip = index >= 0 ? (container_ref.current?.children[index] as HTMLElement | undefined) : undefined;
        if (!chip) return;
        has_scrolled_ref.current = true;
        chip.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }, [selected_id, categories]);

    return (
        <div className='market-selection__category-chips' ref={container_ref}>
            {categories.map(category => (
                <Chip.Selectable
                    key={category.id}
                    selected={category.id === selected_id}
                    onChipSelect={() => {
                        if (category.id !== selected_id)
                            trackMarketCategoryTabClicked({ tab_name: category.id, previous_tab: selected_id });
                        onSelect(category.id);
                    }}
                >
                    <Text size='sm'>{category.label}</Text>
                </Chip.Selectable>
            ))}
        </div>
    );
};

export default MarketCategoryChips;
