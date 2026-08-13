import { mockStore } from '@deriv/stores';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import Multiplier from '../multiplier';

const multiplier_param_label = 'Multiplier';
const multiplier_carousel_testid = 'dt_carousel';
const skeleton_testid = 'square-skeleton';
const mocked_definition = 'Multiplier is...';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => true),
}));

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    WheelPicker: jest.fn(({ data, setSelectedValue }) => (
        <div>
            <p>WheelPicker</p>
            <ul>
                {data.map(({ value }: { value: string }) => (
                    <li key={value}>
                        <button onClick={() => setSelectedValue(value)}>{value}</button>
                    </li>
                ))}
            </ul>
        </div>
    )),
}));
jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isDesktop: false })),
}));
jest.mock('AppV2/Components/TradeParamDefinition', () => jest.fn(() => <div>{mocked_definition}</div>));
jest.mock('lodash.debounce', () =>
    jest.fn(fn => {
        fn.cancel = () => null;
        return fn;
    })
);

describe('<Multiplier />', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(
        () =>
            (default_mock_store = mockStore({
                modules: {
                    trade: {
                        ...mockStore({}),
                        multiplier_range_list: [
                            { text: 'x1', value: 1 },
                            { text: 'x2', value: 2 },
                        ],
                        multiplier: 1,
                        is_purchase_enabled: true,
                    },
                },
                ui: {
                    is_mobile: true,
                },
            }))
    );

    afterEach(() => jest.clearAllMocks());

    const mockMultiplier = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <Multiplier is_minimized />
                </ModulesProvider>
            </TraderProviders>
        );
    it('renders Skeleton loader if multiplier is falsy', () => {
        default_mock_store.modules.trade.multiplier = 0;
        mockMultiplier();

        expect(screen.getByTestId(skeleton_testid)).toBeInTheDocument();
        expect(screen.queryByText(multiplier_param_label)).not.toBeInTheDocument();
    });
    it('renders trade param with multiplier label and input with a value equal to the current multiplier value', () => {
        mockMultiplier();

        expect(screen.getByText(multiplier_param_label)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('x1');
    });
    it('disables trade param if is_market_closed === true', () => {
        default_mock_store.modules.trade.is_market_closed = true;
        mockMultiplier();

        expect(screen.getByRole('textbox')).toBeDisabled();
    });
    it('opens ActionSheet with WheelPicker component, details, "Save" button and trade param definition if user clicks on multiplier trade param', async () => {
        const user = userEvent.setup();
        mockMultiplier();

        expect(screen.queryByTestId('dt-actionsheet-overlay')).not.toBeInTheDocument();

        await user.click(screen.getByText(multiplier_param_label));

        expect(screen.getByTestId('dt-actionsheet-overlay')).toBeInTheDocument();
        expect(screen.getByText('WheelPicker')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getAllByText(mocked_definition).length).toBeGreaterThan(0);
    });
    it('renders skeleton instead of WheelPicker if multiplier_range_list is empty', async () => {
        const user = userEvent.setup();
        default_mock_store.modules.trade.multiplier_range_list = [];
        mockMultiplier();

        await user.click(screen.getByText(multiplier_param_label));

        expect(screen.getByTestId('dt-actionsheet-overlay')).toBeInTheDocument();
        expect(screen.queryByText('WheelPicker')).not.toBeInTheDocument();
        expect(screen.getByTestId(skeleton_testid)).toBeInTheDocument();
    });
    it('does not render a stop out level row in the multiplier sheet', async () => {
        const user = userEvent.setup();
        mockMultiplier();

        await user.click(screen.getByText(multiplier_param_label));

        expect(screen.queryByText('Stop out level')).not.toBeInTheDocument();
    });
    // The sheet is now sized to the wheel itself, so it fits small screens without an override.
    it('keeps the same carousel sizing on small screens', async () => {
        const user = userEvent.setup();
        const original_height = window.innerHeight;
        window.innerHeight = 640;
        mockMultiplier();

        await user.click(screen.getByText(multiplier_param_label));

        expect(screen.getByTestId(multiplier_carousel_testid)).toHaveClass('multiplier__carousel');
        expect(screen.getByTestId(multiplier_carousel_testid)).not.toHaveClass('multiplier__carousel--small');
        window.innerHeight = original_height;
    });
    it('calls onChange function if user changes selected value', async () => {
        const user = userEvent.setup();
        mockMultiplier();

        await user.click(screen.getByText(multiplier_param_label));
        await user.click(screen.getByText('x2'));
        await user.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(default_mock_store.modules.trade.onChange).toBeCalled();
        });
    });
    it('does not render a commission row or explanation page', async () => {
        const user = userEvent.setup();
        default_mock_store.modules.trade.amount = 10;
        mockMultiplier();

        await user.click(screen.getByText(multiplier_param_label));

        expect(screen.queryByText('Commission')).not.toBeInTheDocument();
    });
});
