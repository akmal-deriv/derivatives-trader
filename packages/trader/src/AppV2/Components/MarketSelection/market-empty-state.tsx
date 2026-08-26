import React from 'react';

import { Text } from '@deriv-com/quill-ui';

import NoMarketFoundIcon from './no-market-found-icon';

type TMarketEmptyState = {
    title: React.ReactNode;
    description: React.ReactNode;
};

/** Centered empty state for the selector — an illustration above the title + description (e.g. the
 * Favourites tab with no favourites, or a search that matched nothing). */
const MarketEmptyState = ({ title, description }: TMarketEmptyState) => (
    <div className='market-empty-state'>
        <NoMarketFoundIcon />
        <Text size='md' bold className='market-empty-state__title'>
            {title}
        </Text>
        <Text size='sm' className='market-empty-state__description'>
            {description}
        </Text>
    </div>
);

export default MarketEmptyState;
