import React from 'react';

import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UrlUnavailableModal from '../url-unavailable-modal';

describe('<UrlUnavailableModal />', () => {
    let modalRootEl: HTMLDivElement;

    beforeAll(() => {
        modalRootEl = document.createElement('div');
        modalRootEl.setAttribute('id', 'modal_root');
        document.body.appendChild(modalRootEl);
    });

    afterAll(() => {
        document.body.removeChild(modalRootEl);
    });

    const gotItButtonName = 'Got it';

    const renderComponent = (store: ReturnType<typeof mockStore>) =>
        render(
            <StoreProvider store={store}>
                <UrlUnavailableModal />
            </StoreProvider>
        );

    const makeStore = (overrides: Record<string, unknown>) =>
        mockStore({ ui: { isUrlUnavailableModalVisible: true, ...overrides } });

    describe('Desktop Modal', () => {
        it('blames only the trade type when the invalid value is the trade type', () => {
            renderComponent(makeStore({ is_mobile: false, urlUnavailableModalReason: 'trade_type' }));
            expect(screen.getByRole('heading', { name: /Unsupported trade type/i })).toBeInTheDocument();
            expect(
                screen.getByText(
                    'The trade type in this link is unavailable. You can continue with the default trade type instead.'
                )
            ).toBeInTheDocument();
            // The market was already validated in this variant, so the copy must not blame it.
            expect(screen.queryByText(/market/i)).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: gotItButtonName })).toBeInTheDocument();
        });

        it('blames only the market when the invalid value is the symbol', () => {
            renderComponent(makeStore({ is_mobile: false, urlUnavailableModalReason: 'symbol' }));
            expect(screen.getByRole('heading', { name: /Unsupported market/i })).toBeInTheDocument();
            expect(
                screen.getByText(
                    'The market in this link is unavailable. You can continue with the default market instead.'
                )
            ).toBeInTheDocument();
            // The trade type was already validated in this variant, so the copy must not blame it.
            expect(screen.queryByText(/trade type/i)).not.toBeInTheDocument();
        });

        it('names both values when the trade type and the market are invalid', () => {
            renderComponent(makeStore({ is_mobile: false, urlUnavailableModalReason: 'both' }));
            expect(screen.getByRole('heading', { name: /Unsupported link/i })).toBeInTheDocument();
            expect(screen.getByText(/default trade type and market instead/i)).toBeInTheDocument();
        });

        it('renders no close (X) icon, since the design has no close button (GRWT-9325)', () => {
            renderComponent(makeStore({ is_mobile: false, urlUnavailableModalReason: 'trade_type' }));
            expect(document.querySelector('.quill-modal__close-icon')).not.toBeInTheDocument();
            // "Got it" must be the only control left, as it is now the only dismissal affordance.
            expect(screen.getAllByRole('button')).toHaveLength(1);
            expect(screen.getByRole('button', { name: gotItButtonName })).toBeInTheDocument();
        });

        it('calls toggleUrlUnavailableModal when Got it is clicked', async () => {
            const store = makeStore({ is_mobile: false, urlUnavailableModalReason: 'trade_type' });
            const toggleUrlUnavailableModal = jest.fn();
            store.ui.toggleUrlUnavailableModal = toggleUrlUnavailableModal;
            renderComponent(store);
            await userEvent.click(screen.getByRole('button', { name: gotItButtonName }));
            expect(toggleUrlUnavailableModal).toBeCalledWith(false);
        });
    });

    describe('Mobile Action Sheet', () => {
        it('renders the action sheet with reason-aware copy and no close (X) icon', () => {
            renderComponent(makeStore({ is_mobile: true, urlUnavailableModalReason: 'symbol' }));
            expect(screen.getByText(/Unsupported market/i)).toBeInTheDocument();
            expect(
                screen.getByText(
                    'The market in this link is unavailable. You can continue with the default market instead.'
                )
            ).toBeInTheDocument();
            expect(document.querySelector('.quill-modal__close-icon')).not.toBeInTheDocument();
            expect(screen.getAllByRole('button')).toHaveLength(1);
            expect(screen.getByRole('button', { name: gotItButtonName })).toBeInTheDocument();
        });

        it('calls toggleUrlUnavailableModal when Got it is clicked on mobile', async () => {
            const store = makeStore({ is_mobile: true, urlUnavailableModalReason: 'trade_type' });
            const toggleUrlUnavailableModal = jest.fn();
            store.ui.toggleUrlUnavailableModal = toggleUrlUnavailableModal;
            renderComponent(store);
            await userEvent.click(screen.getByRole('button', { name: gotItButtonName }));
            expect(toggleUrlUnavailableModal).toBeCalledWith(false);
        });
    });

    it('does not render anything when isUrlUnavailableModalVisible is false', () => {
        renderComponent(mockStore({ ui: { isUrlUnavailableModalVisible: false } }));
        expect(screen.queryByText(/Unsupported/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: gotItButtonName })).not.toBeInTheDocument();
    });
});
