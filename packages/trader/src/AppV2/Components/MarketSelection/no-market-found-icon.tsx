import React from 'react';

import { getUrlBase } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

type TNoMarketFoundIcon = {
    width?: number;
    height?: number;
};

// Served from core's static images (copied to /public/images/common), matching how the rest of the
// app references raster assets.
const NO_MARKET_FOUND_SRC = getUrlBase('/public/images/common/no-market-found.webp');

/** Illustration shown in the market selector's empty states (no favourites / no search results). */
const NoMarketFoundIcon: React.FC<TNoMarketFoundIcon> = ({ width = 96, height = 96 }) => (
    <img src={NO_MARKET_FOUND_SRC} alt={localize('No market found')} width={width} height={height} />
);

export default NoMarketFoundIcon;
