import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { formatDuration, getDateFromNow, getDiffDuration, shouldShowExpiration } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useTraderStore } from 'Stores/useTraderStores';

/**
 * Read-only summary shown at the top of the Risk management action sheet (responsive): the contract's
 * expiry, for symbols that expire. This previously lived in its own below-params info row, which is
 * dropped on responsive. (The deal cancellation fee lives inside the Deal cancellation tab.)
 */
const RiskManagementInfo = observer(() => {
    const { expiration, is_market_closed, symbol } = useTraderStore();
    const { common } = useStore();
    const { server_time: start_time } = common;

    if (!shouldShowExpiration(symbol)) return null;

    const { days, timestamp } = formatDuration(
        getDiffDuration(Number(start_time?.unix()), Number(expiration)),
        'HH:mm'
    );
    const date = getDateFromNow(days, 'day', 'DD MMM YYYY');
    const text_class = clsx(is_market_closed && 'trade-params__text--disabled');

    return (
        <div className='risk-management__info'>
            <div className='risk-management__info-row'>
                <Text size='sm' className={text_class}>
                    <Localize i18n_default_text='Expires on' />
                </Text>
                <Text size='sm' className={text_class}>
                    <Localize i18n_default_text='{{date}} at {{timestamp}}' values={{ date, timestamp }} />
                </Text>
            </div>
        </div>
    );
});

export default RiskManagementInfo;
