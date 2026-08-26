import clsx from 'clsx';

import { Button, Text as DerivText } from '@deriv/components';
import {
    addComma,
    getContractTypesConfig,
    getCurrencyDisplayCode,
    getSymbolDisplayName,
    redirectToLogin,
} from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { CaptionText, Text } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import SymbolIconsMapper from 'AppV2/Components/SymbolIconsMapper/symbol-icons-mapper';
import { useTraderStore } from 'Stores/useTraderStores';

import './compact-header.scss';

/**
 * Slim header shown in place of the full account header while the chart is maximized
 * (mobile only). Mirrors the Flutter `CompactTradeHeader`: a two-line stack on each side —
 * `<symbol name>` over `<trade-type>` (left, with the market icon) and `<account>` over
 * `<balance>` (right, right-aligned) — so focus stays on the enlarged chart without losing
 * context. Read-only: no account switcher (matching the prototype).
 */
const CompactHeader = observer(() => {
    const {
        client: { balance, currency, is_logged_in, is_virtual },
        common: { current_language },
        ui: { is_chart_maximized },
    } = useStore();
    const { symbol, contract_type } = useTraderStore();

    const display_name = getSymbolDisplayName(symbol);
    const trade_type_title = getContractTypesConfig()[contract_type]?.title;
    const is_valid_balance = balance != null && balance !== '' && !isNaN(Number(String(balance).replace(/,/g, '')));

    return (
        <div
            className={clsx('compact-header', { 'compact-header--hidden': !is_chart_maximized })}
            data-testid='dt_compact_header'
        >
            <div className='compact-header__market'>
                <SymbolIconsMapper symbol={symbol} />
                <div className='compact-header__market-labels'>
                    <Text size='sm' bold className='compact-header__symbol'>
                        {display_name}
                    </Text>
                    {trade_type_title && (
                        <CaptionText size='sm' className='compact-header__trade-type'>
                            {trade_type_title}
                        </CaptionText>
                    )}
                </div>
            </div>
            {is_logged_in ? (
                <div className='compact-header__account'>
                    {/* Use the same @deriv/components Text + color tokens as the main header's
                        account-info (label: tertiary for demo / secondary-alternate for real;
                        balance: primary) so the maximized header stays visually consistent. */}
                    <DerivText as='p' size='xs' color={is_virtual ? 'tertiary' : 'secondary-alternate'}>
                        {is_virtual ? (
                            <Localize i18n_default_text='Demo account' />
                        ) : (
                            <Localize i18n_default_text='Real account' />
                        )}
                    </DerivText>
                    <DerivText size='s' weight='bold' color='primary' className='compact-header__balance'>
                        {is_valid_balance ? `${addComma(balance, 2)} ${getCurrencyDisplayCode(currency)}` : ''}
                    </DerivText>
                </div>
            ) : (
                // Logged out: show the exact same primary "Log in" CTA as the shell header's
                // LoginButton (@deriv/components Button, primary + has_effect, `acc-info__button`)
                // instead of a misleading account label. Distinct id avoids clashing with the
                // always-mounted shell header's `dt_login_button_v2`.
                <Button
                    id='dt_login_button_compact'
                    className='acc-info__button'
                    has_effect
                    primary
                    text={localize('Log in')}
                    onClick={() => redirectToLogin(current_language)}
                />
            )}
        </div>
    );
});

export default CompactHeader;
