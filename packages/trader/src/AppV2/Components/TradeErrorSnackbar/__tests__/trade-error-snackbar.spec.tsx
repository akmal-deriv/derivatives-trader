import React from 'react';

import { CONTRACT_TYPES, TRADE_TYPES } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { useSnackbar } from '@deriv-com/quill-ui';
import { render } from '@testing-library/react';

import TraderProviders from '../../../../trader-providers';
import TradeErrorSnackbar from '../trade-error-snackbar';

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    useSnackbar: jest.fn(),
}));

describe('TradeErrorSnackbar', () => {
    let default_mock_store: ReturnType<typeof mockStore>,
        default_mock_props: React.ComponentProps<typeof TradeErrorSnackbar>;
    let mockAddSnackbar = jest.fn();

    beforeEach(() => {
        default_mock_store = mockStore({
            client: { is_logged_in: true },
            modules: {
                trade: {
                    contract_type: TRADE_TYPES.TURBOS.LONG,
                    proposal_info: {
                        TURBOSLONG: {
                            has_error: true,
                            has_error_details: false,
                            error_code: 'ContractBuyValidationError',
                            error_field: 'take_profit',
                            message: 'Enter an amount equal to or lower than 1701.11.',
                        },
                    },
                    validation_errors: {
                        amount: [],
                        barrier_1: [],
                        barrier_2: [],
                        duration: [],
                        start_date: [],
                        start_time: [],
                        stop_loss: [],
                        take_profit: [],
                        expiry_date: [],
                        expiry_time: [],
                    },
                    trade_type_tab: CONTRACT_TYPES.TURBOS.LONG,
                    trade_types: {
                        [CONTRACT_TYPES.TURBOS.LONG]: 'Turbos Long',
                    },
                },
            },
        });
        default_mock_props = { error_fields: ['take_profit', 'stop_loss'], should_show_snackbar: true };
        mockAddSnackbar = jest.fn();
        (useSnackbar as jest.Mock).mockReturnValue({ addSnackbar: mockAddSnackbar });
    });

    const mockTradeErrorSnackbar = () => {
        return (
            <TraderProviders store={default_mock_store}>
                <TradeErrorSnackbar {...default_mock_props} />
            </TraderProviders>
        );
    };

    it('calls useSnackbar if error field in proposal matches the passed error_fields', () => {
        render(mockTradeErrorSnackbar());

        expect(mockAddSnackbar).toHaveBeenCalled();
    });

    it('calls useSnackbar if error field in proposal matches the passed error_fields even if user is log out', () => {
        default_mock_store.client.is_logged_in = false;
        render(mockTradeErrorSnackbar());

        expect(mockAddSnackbar).toHaveBeenCalled();
    });

    it('calls useSnackbar for a store validation error even when should_show_snackbar is false', () => {
        // Rise/Fall has two subtypes and no tabs, and a store validation error empties proposal_info,
        // so the per-subtype suppression gate is closed. The error still has to reach the user.
        const insufficient_balance_error = 'Your stake exceeds your available balance.';
        default_mock_store.modules.trade.contract_type = TRADE_TYPES.RISE_FALL;
        default_mock_store.modules.trade.trade_type_tab = '';
        default_mock_store.modules.trade.trade_types = {
            [CONTRACT_TYPES.CALL]: 'Higher',
            [CONTRACT_TYPES.PUT]: 'Lower',
        };
        default_mock_store.modules.trade.proposal_info = {};
        default_mock_store.modules.trade.validation_errors.amount = [insufficient_balance_error];
        default_mock_props = { error_fields: ['stake', 'amount'], should_show_snackbar: false };

        render(mockTradeErrorSnackbar());

        expect(mockAddSnackbar).toHaveBeenCalledWith(
            expect.objectContaining({ message: insufficient_balance_error, status: 'fail' })
        );
    });

    it('does not call useSnackbar for a subtype-scoped proposal error when should_show_snackbar is false', () => {
        default_mock_store.modules.trade.contract_type = TRADE_TYPES.RISE_FALL;
        default_mock_store.modules.trade.trade_type_tab = '';
        default_mock_store.modules.trade.trade_types = {
            [CONTRACT_TYPES.CALL]: 'Higher',
            [CONTRACT_TYPES.PUT]: 'Lower',
        };
        default_mock_store.modules.trade.proposal_info = {
            [CONTRACT_TYPES.CALL]: {
                has_error: true,
                has_error_details: false,
                error_code: 'ContractBuyValidationError',
                error_field: 'amount',
                message: "Please enter a stake amount that's at least 0.35.",
            },
            [CONTRACT_TYPES.PUT]: { has_error: false, message: '', payout: 19.51 },
        };
        default_mock_props = { error_fields: ['stake', 'amount'], should_show_snackbar: false };

        render(mockTradeErrorSnackbar());

        expect(mockAddSnackbar).not.toHaveBeenCalled();
    });

    it('does not call useSnackbar if error field in proposal does not matches the passed error_fields', () => {
        default_mock_store.modules.trade.proposal_info = {
            TURBOSLONG: {
                has_error: true,
                has_error_details: false,
                error_code: 'ContractBuyValidationError',
                error_field: 'new_trade_param',
                message: 'Enter an amount equal to or lower than 1701.11.',
            },
        };
        render(mockTradeErrorSnackbar());

        expect(mockAddSnackbar).not.toHaveBeenCalled();
    });
});
