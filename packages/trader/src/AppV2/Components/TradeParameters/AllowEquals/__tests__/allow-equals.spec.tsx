import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { hasCallPutEqual, hasDurationForCallPutEqual } from 'Stores/Modules/Trading/Helpers/allow-equals';
import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import AllowEquals from '../allow-equals';

jest.mock('@deriv/quill-icons', () => ({
    ...jest.requireActual('@deriv/quill-icons'),
    LabelPairedCircleInfoMdRegularIcon: jest.fn(({ onClick }) => (
        <button onClick={onClick}>LabelPairedCircleInfoMdRegularIcon</button>
    )),
}));

jest.mock('Stores/Modules/Trading/Helpers/allow-equals', () => ({
    ...jest.requireActual('Stores/Modules/Trading/Helpers/allow-equals'),
    hasCallPutEqual: jest.fn(() => true),
    hasDurationForCallPutEqual: jest.fn(() => true),
}));

const title = 'Allow equals';

describe('AllowEquals', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => (default_mock_store = mockStore({})));

    const mockAllowEquals = (is_minimized?: boolean) => {
        return (
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <AllowEquals is_minimized={is_minimized} />
                </ModulesProvider>
            </TraderProviders>
        );
    };

    it('does not render component if hasCallPutEqual return false', () => {
        (hasCallPutEqual as jest.Mock).mockReturnValueOnce(false);
        const { container } = render(mockAllowEquals());

        expect(container).toBeEmptyDOMElement();
    });

    it('does not render component if hasDurationForCallPutEqual return false', () => {
        (hasDurationForCallPutEqual as jest.Mock).mockReturnValueOnce(false);
        const { container } = render(mockAllowEquals());

        expect(container).toBeEmptyDOMElement();
    });

    const getToggleSwitch = () => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.hasAttribute('aria-pressed'))!;
    };

    it('renders component with ToggleSwitch state value aria-pressed === false if is_equal is 0', () => {
        render(mockAllowEquals());

        expect(screen.getByText(title)).toBeInTheDocument();
        expect(getToggleSwitch()).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders component with ToggleSwitch state value aria-pressed === true if is_equal is 1', () => {
        default_mock_store.modules.trade.is_equal = 1;
        render(mockAllowEquals());

        expect(screen.getByText(title)).toBeInTheDocument();
        expect(getToggleSwitch()).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onChange function if user clicks on ToggleSwitch', async () => {
        render(mockAllowEquals());

        await userEvent.click(getToggleSwitch());

        expect(default_mock_store.modules.trade.onChange).toBeCalled();
    });

    it('renders ActionSheet with definition if user clicks on "Allow equal" term', async () => {
        render(mockAllowEquals());

        await userEvent.click(screen.getByText(title));

        expect(screen.getByText('Win a payout if the exit spot is equal to the entry spot.')).toBeInTheDocument();
    });

    it('renders disabled ToggleSwitch is is_market_closed === true', () => {
        default_mock_store.modules.trade.is_market_closed = true;
        render(mockAllowEquals());

        expect(getToggleSwitch()).toBeDisabled();
    });

    describe('Minimized view', () => {
        it('renders TextField with "-" when is_equal is 0 and is_minimized is true', () => {
            render(mockAllowEquals(true));

            expect(screen.getByDisplayValue('-')).toBeInTheDocument();
        });

        it('renders TextField with "Yes" when is_equal is 1 and is_minimized is true', () => {
            default_mock_store.modules.trade.is_equal = 1;
            render(mockAllowEquals(true));

            expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
        });

        it('opens ActionSheet with ToggleSwitch on TextField click in minimized mode', async () => {
            render(mockAllowEquals(true));

            await userEvent.click(screen.getByDisplayValue('-'));

            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(getToggleSwitch()).toBeInTheDocument();
        });

        it('does not call onChange when toggle is clicked without saving', async () => {
            render(mockAllowEquals(true));

            await userEvent.click(screen.getByDisplayValue('-'));
            await userEvent.click(getToggleSwitch());

            expect(default_mock_store.modules.trade.onChange).not.toHaveBeenCalled();
        });

        it('calls onChange only when Save is clicked in minimized ActionSheet', async () => {
            render(mockAllowEquals(true));

            await userEvent.click(screen.getByDisplayValue('-'));
            await userEvent.click(getToggleSwitch());
            await userEvent.click(screen.getByText('Save'));

            expect(default_mock_store.modules.trade.onChange).toHaveBeenCalledWith({
                target: { name: 'is_equal', value: 1 },
            });
        });

        it('does not render when has_allow_equals is false in minimized mode', () => {
            (hasCallPutEqual as jest.Mock).mockReturnValueOnce(false);
            const { container } = render(mockAllowEquals(true));

            expect(container).toBeEmptyDOMElement();
        });

        it('renders disabled TextField when is_market_closed is true in minimized mode', () => {
            default_mock_store.modules.trade.is_market_closed = true;
            render(mockAllowEquals(true));

            expect(screen.getByDisplayValue('-')).toBeDisabled();
        });

        it('shows description page when info icon is clicked in minimized ActionSheet', async () => {
            render(mockAllowEquals(true));

            await userEvent.click(screen.getByDisplayValue('-'));

            await userEvent.click(screen.getByText('LabelPairedCircleInfoMdRegularIcon'));

            expect(screen.getByText('Win a payout if the exit spot is equal to the entry spot.')).toBeInTheDocument();
        });
    });
});
