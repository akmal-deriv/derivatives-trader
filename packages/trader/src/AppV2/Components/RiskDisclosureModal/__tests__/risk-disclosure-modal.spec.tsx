import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RiskDisclosureModal from '../risk-disclosure-modal';

const DISCLAIMER =
    'The products offered are difficult to understand. CNMV considers that, in general, it is not appropriate for retail investors.';

const mockAccept = jest.fn();
const mockClose = jest.fn();
const mockAddSnackbar = jest.fn();

let mockHookValue = {
    is_open: true,
    is_loading: false,
    is_fully_accepted: false,
    is_eligible: true,
    is_evaluating: false,
    error: null as Error | null,
    open: jest.fn(),
    close: mockClose,
    accept: mockAccept,
};

jest.mock('AppV2/Hooks/useRiskDisclosure', () => ({
    useRiskDisclosure: () => mockHookValue,
}));

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

beforeEach(() => {
    jest.clearAllMocks();
    mockHookValue = {
        is_open: true,
        is_loading: false,
        is_fully_accepted: false,
        is_eligible: true,
        is_evaluating: false,
        error: null,
        open: jest.fn(),
        close: mockClose,
        accept: mockAccept,
    };
});

describe('RiskDisclosureModal', () => {
    it('renders the disclaimer text and instruction', () => {
        render(<RiskDisclosureModal />);
        expect(screen.getByText('Risk disclosure')).toBeInTheDocument();
        expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
        expect(screen.getByText('To continue, type the message below:')).toBeInTheDocument();
    });

    it('keeps the Agree button disabled when typed text does not match the disclaimer', () => {
        render(<RiskDisclosureModal />);
        expect(screen.getByRole('button', { name: 'Agree' })).toBeDisabled();

        const textarea = screen.getByPlaceholderText(DISCLAIMER);
        fireEvent.change(textarea, { target: { value: 'wrong text' } });
        expect(screen.getByRole('button', { name: 'Agree' })).toBeDisabled();
    });

    it('enables the Agree button when typed text matches the disclaimer', () => {
        render(<RiskDisclosureModal />);
        const textarea = screen.getByPlaceholderText(DISCLAIMER);
        fireEvent.change(textarea, { target: { value: DISCLAIMER } });
        expect(screen.getByRole('button', { name: 'Agree' })).toBeEnabled();
    });

    it('calls accept when the user types the disclaimer and clicks Agree', () => {
        render(<RiskDisclosureModal />);
        const textarea = screen.getByPlaceholderText(DISCLAIMER);
        fireEvent.change(textarea, { target: { value: DISCLAIMER } });
        fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
        expect(mockAccept).toHaveBeenCalledTimes(1);
    });

    it('calls close when Cancel is clicked', () => {
        render(<RiskDisclosureModal />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('shows only a Close button when both flags are already accepted', () => {
        mockHookValue = { ...mockHookValue, is_fully_accepted: true };
        render(<RiskDisclosureModal />);
        expect(screen.queryByRole('button', { name: 'Agree' })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText(DISCLAIMER)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('copies the disclaimer to clipboard and shows a snackbar', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(<RiskDisclosureModal />);
        await userEvent.click(screen.getByLabelText('Copy disclaimer'));
        expect(writeText).toHaveBeenCalledWith(DISCLAIMER);
        expect(mockAddSnackbar).toHaveBeenCalled();
    });

    it('normalises whitespace differences when matching the disclaimer', () => {
        render(<RiskDisclosureModal />);
        const textarea = screen.getByPlaceholderText(DISCLAIMER);
        fireEvent.change(textarea, { target: { value: `  ${DISCLAIMER.replace(/ /g, '  ')}  ` } });
        expect(screen.getByRole('button', { name: 'Agree' })).toBeEnabled();
    });
});
