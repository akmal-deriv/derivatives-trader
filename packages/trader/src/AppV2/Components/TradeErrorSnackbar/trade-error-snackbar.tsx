import React from 'react';

import { observer, useStore } from '@deriv/stores';
import { useSnackbar } from '@deriv-com/quill-ui';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';

import useTradeError, { TErrorFields } from '../../Hooks/useTradeError';

/**
 * Enqueues an auto-dismissing error snackbar whenever a BE error matching one of the passed
 * `error_fields` is present in the proposal.
 *
 * Architectural note: this component only ENQUEUES snackbars via `useSnackbar` — it renders
 * nothing on purpose. Displaying the queue requires a `SnackbarController` mounted in the same
 * `SnackbarProvider` tree; AppV2's root already mounts the single controller (see
 * `ServicesErrorSnackbar`, mounted in AppV2/app.tsx on every route). Do not render another
 * `SnackbarController` here: every controller portals the *same* provider queue into
 * `document.body`, so a second one stacks an identical fixed snackbar on top of the first,
 * and the lower copy swallows taps (its buttons stop receiving pointer events).
 */
const TradeErrorSnackbar = observer(
    ({ error_fields, should_show_snackbar }: { error_fields: TErrorFields[]; should_show_snackbar?: boolean }) => {
        const {
            client: { is_logged_in },
        } = useStore();
        const { addSnackbar } = useSnackbar();
        const { is_error_matching_field: has_error, message } = useTradeError({
            error_fields, // array with BE error_fields, for which we will track errors.
        });

        React.useEffect(() => {
            if (has_error && should_show_snackbar) {
                addSnackbar({
                    message,
                    status: 'fail',
                    hasCloseButton: true,
                    hasFixedHeight: false,
                    delay: ERROR_SNACKBAR_DURATION,
                    style: {
                        marginBottom: is_logged_in ? '48px' : '-8px',
                        width: 'calc(100% - var(--core-spacing-800)',
                    },
                });
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [has_error, should_show_snackbar]);

        return null;
    }
);

export default TradeErrorSnackbar;
