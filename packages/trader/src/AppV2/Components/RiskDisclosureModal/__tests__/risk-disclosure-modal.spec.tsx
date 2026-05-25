import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RiskDisclosureModal from '../risk-disclosure-modal';

const DISCLAIMER =
    'The products offered are difficult to understand. CNMV considers that, in general, it is not appropriate for retail investors.';

const mockOnAccept = jest.fn();
const mockOnClose = jest.fn();
const mockAddSnackbar = jest.fn();

jest.mock('@deriv-com/ui', () => ({
    useDevice: () => ({ isMobile: false, isDesktop: true }),
}));

jest.mock('@deriv-com/translations', () => {
    const actual = jest.requireActual('@deriv-com/translations');
    return {
        ...actual,
        useTranslations: () => ({ localize: (str: string) => str }),
    };
});

jest.mock('@deriv-com/quill-ui', () => {
    const actual = jest.requireActual('@deriv-com/quill-ui');
    return {
        ...actual,
        useSnackbar: () => ({ addSnackbar: mockAddSnackbar }),
    };
});

type TProps = Partial<React.ComponentProps<typeof RiskDisclosureModal>>;

const renderModal = (props: TProps = {}) =>
    render(
        <RiskDisclosureModal
            is_open
            is_loading={false}
            is_fully_accepted={false}
            error={null}
            onAccept={mockOnAccept}
            onClose={mockOnClose}
            {...props}
        />
    );

beforeEach(() => {
    jest.clearAllMocks();
});

describe('RiskDisclosureModal', () => {
    it('renders the disclaimer text and instruction', () => {
        renderModal();
        expect(screen.getByText('Risk disclosure')).toBeInTheDocument();
        expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
        expect(screen.getByText('To continue, type the message below:')).toBeInTheDocument();
    });

    it('keeps the Continue button disabled when typed text does not match', () => {
        renderModal();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText(DISCLAIMER), { target: { value: 'wrong text' } });
        expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('enables the Continue button when typed text matches the disclaimer', () => {
        renderModal();
        fireEvent.change(screen.getByPlaceholderText(DISCLAIMER), { target: { value: DISCLAIMER } });
        expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    });

    it('calls onAccept when Continue is clicked with matching text', () => {
        renderModal();
        fireEvent.change(screen.getByPlaceholderText(DISCLAIMER), { target: { value: DISCLAIMER } });
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel is clicked', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows only a Close button when fully accepted', () => {
        renderModal({ is_fully_accepted: true });
        expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText(DISCLAIMER)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('copies the disclaimer to clipboard and shows a snackbar', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        renderModal();
        await userEvent.click(screen.getByLabelText('Copy disclaimer'));
        expect(writeText).toHaveBeenCalledWith(DISCLAIMER);
        expect(mockAddSnackbar).toHaveBeenCalled();
    });

    it('normalises whitespace differences when matching the disclaimer', () => {
        renderModal();
        fireEvent.change(screen.getByPlaceholderText(DISCLAIMER), {
            target: { value: `  ${DISCLAIMER.replace(/ /g, '  ')}  ` },
        });
        expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    });

    it('fires an error snackbar when the error prop becomes truthy', () => {
        const { rerender } = renderModal();
        expect(mockAddSnackbar).not.toHaveBeenCalled();

        rerender(
            <RiskDisclosureModal
                is_open
                is_loading={false}
                is_fully_accepted={false}
                error={new Error('boom')}
                onAccept={mockOnAccept}
                onClose={mockOnClose}
            />
        );
        expect(mockAddSnackbar).toHaveBeenCalledTimes(1);
    });
});
