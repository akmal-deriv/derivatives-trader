import React from 'react';
import { useLocation } from 'react-router-dom';

import { getStaticUrl, isEmptyObject, isValidToCancel, routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { SnackbarController, useSnackbar } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

import useContractDetails from 'AppV2/Hooks/useContractDetails';
import { checkIsServiceModalError, SERVICE_ERROR } from 'AppV2/Utils/layout-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * Opens a document (T&C PDF) in a new tab. `window.open` on its own is not enough:
 * in-app webviews and pop-up blockers refuse the request and return `null` (or throw),
 * which is what made this action look completely dead — so fall back to navigating the
 * current tab. `noopener` is deliberately not passed as a window feature because
 * browsers then always return `null`, which is indistinguishable from a refusal; the
 * opener reference is dropped right after opening instead.
 */
const openDocument = (url: string) => {
    if (!url) return;

    let document_window: Window | null = null;

    try {
        document_window = window.open(url, '_blank');
    } catch {
        document_window = null;
    }

    if (document_window) {
        document_window.opener = null;
        return;
    }

    window.location.href = url;
};

const ServicesErrorSnackbar = observer(() => {
    const { localize } = useTranslations();
    const {
        common: { services_error, resetServicesError },
        client: { is_logged_in },
    } = useStore();
    const { is_multiplier, proposal_info, validation_errors, trade_types, contract_type, trade_type_tab } =
        useTraderStore();
    const { contract_info } = useContractDetails();
    const { addSnackbar } = useSnackbar();
    const { pathname } = useLocation();

    const { code, message } = services_error || {};
    const has_services_error = !isEmptyObject(services_error);
    const is_modal_error = checkIsServiceModalError({ services_error });
    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);

    // Some BO errors comes inside of proposal and we store them inside of proposal_info.
    // Such error have no error_field and it is one of the main differences from trade parameters errors (duration, stake and etc).
    // Another difference is that trade params errors arrays in validation_errors are empty.
    const {
        has_error,
        error_field,
        error_code: proposal_error_code,
        message: contract_error_message,
    } = proposal_info[contract_types[0]] ?? {};
    // Exclude MarketIsClosed errors from snackbar - already handled by ClosedMarketMessage component
    const is_market_closed_error = proposal_error_code === 'MarketIsClosed';
    const contract_error =
        has_error &&
        !error_field &&
        !is_market_closed_error &&
        !Object.keys(validation_errors).some(key => validation_errors[key].length);

    const checkShouldShowErrorSnackBar = () => {
        if (!has_services_error && !contract_error) return false;
        if (pathname === routes.index) return (has_services_error && !is_modal_error) || contract_error;
        if (pathname === routes.trader_automate) return has_services_error && !is_modal_error;
        if (pathname === routes.trader_positions || pathname.startsWith(routes.contract.replace('/:contract_id', '')))
            return has_services_error;
        return false;
    };

    const should_show_error_snackbar = checkShouldShowErrorSnackBar();
    const should_contain_action = should_show_error_snackbar && code === SERVICE_ERROR.COMPANY_WIDE_LIMIT_EXCEEDED;
    const bottom_position =
        pathname.startsWith(routes.contract.replace('/:contract_id', '')) &&
        is_multiplier &&
        isValidToCancel(contract_info)
            ? '104px'
            : '48px';
    const action_props = {
        actionText: localize('View'),
        onActionClick: () => openDocument(getStaticUrl('tnc/trading-terms.pdf', true)),
    };

    React.useEffect(() => {
        if (should_show_error_snackbar) {
            addSnackbar({
                message: message ?? contract_error_message,
                status: 'fail',
                hasCloseButton: true,
                hasFixedHeight: false,
                onSnackbarRemove: resetServicesError,
                style: {
                    marginBottom: is_logged_in ? bottom_position : '-8px',
                    width: 'calc(100% - var(--core-spacing-800)',
                },
                ...(should_contain_action ? action_props : {}),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [should_show_error_snackbar, should_contain_action]);

    return <SnackbarController />;
});

export default ServicesErrorSnackbar;
