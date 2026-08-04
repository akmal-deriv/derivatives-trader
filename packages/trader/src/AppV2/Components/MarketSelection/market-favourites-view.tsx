import { Text } from '@deriv-com/quill-ui';
import { useDevice } from '@deriv-com/ui';

import { TFavouriteGroup } from 'AppV2/Utils/market-selection-utils';

import MarketSelectionRowDesktop from './market-selection-row-desktop';
import MarketSelectionRowMobile from './market-selection-row-mobile';

type TMarketFavouritesView = {
    groups: TFavouriteGroup[];
    change_by_symbol?: Map<string, number | null>;
    series_by_symbol?: Map<string, number[]>;
    onSelectFavourite: (underlying_symbol: string, trade_type: string) => void;
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
};

/**
 * The Favourites tab content: favourites grouped by trade type (Rise/Fall, …), each split into
 * "Subgroup (Submarket)" sections. Each row belongs to its group's trade type, so favourite state is
 * scoped to that combo (favourites are per symbol + tab).
 */
const MarketFavouritesView = ({
    groups,
    change_by_symbol,
    series_by_symbol,
    onSelectFavourite,
    onInfo,
}: TMarketFavouritesView) => {
    const { isMobile } = useDevice();
    const Row = !isMobile ? MarketSelectionRowDesktop : MarketSelectionRowMobile;

    return (
        <div className='market-selection-list'>
            {groups.map(group => (
                <div className='market-favourites__group' key={group.trade_type}>
                    <Text bold size='lg' className='market-favourites__trade-type'>
                        {group.label}
                    </Text>
                    {group.subgroups.map(subgroup => (
                        <div className='market-selection-list__group' key={subgroup.key}>
                            <div className='market-selection-list__group-header'>
                                <Text bold size='sm' className='market-selection-list__group-title'>
                                    {subgroup.title}
                                </Text>
                            </div>
                            {subgroup.items.map(item => (
                                <Row
                                    key={item.underlying_symbol}
                                    item={item}
                                    trade_type={group.trade_type}
                                    onSelect={underlying_symbol =>
                                        onSelectFavourite(underlying_symbol, group.trade_type)
                                    }
                                    change_percentage={change_by_symbol?.get(item.underlying_symbol ?? '') ?? null}
                                    series={series_by_symbol?.get(item.underlying_symbol ?? '')}
                                    onInfo={onInfo}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MarketFavouritesView;
