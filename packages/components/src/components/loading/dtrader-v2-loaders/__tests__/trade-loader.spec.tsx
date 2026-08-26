import { useDevice } from '@deriv-com/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';

import TradeLoader from '../trade-loader';

const toast_message = 'Loading the trade page. This may take a few seconds.';

describe('TradeLoader', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        (useDevice as jest.Mock).mockReturnValue({ isDesktop: true });
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('should render the desktop loader without tap-feedback toast initially', () => {
        render(<TradeLoader />);
        expect(screen.getByTestId('dt_trade_loader')).toBeInTheDocument();
        expect(screen.queryByText(toast_message)).not.toBeInTheDocument();
    });

    it('should show the tap-feedback toast when a child skeleton is tapped', () => {
        render(<TradeLoader />);
        fireEvent.click(screen.getAllByTestId('dt_skeleton')[0]);
        expect(screen.getByText(toast_message)).toBeInTheDocument();
    });

    it('should show exactly one toast for multiple rapid taps', () => {
        render(<TradeLoader />);
        const loader = screen.getByTestId('dt_trade_loader');
        for (let i = 0; i < 4; i++) {
            fireEvent.click(loader);
        }
        expect(screen.getAllByText(toast_message)).toHaveLength(1);
    });

    it('should auto-dismiss the toast and allow a fresh one on a later tap', () => {
        render(<TradeLoader />);
        const loader = screen.getByTestId('dt_trade_loader');

        fireEvent.click(loader);
        expect(screen.getByText(toast_message)).toBeInTheDocument();

        // first advance fires the auto-dismiss timer (visible -> exiting),
        // second one the exit-animation unmount (exiting -> hidden)
        act(() => {
            jest.advanceTimersByTime(4100);
        });
        act(() => {
            jest.advanceTimersByTime(500);
        });
        expect(screen.queryByText(toast_message)).not.toBeInTheDocument();

        fireEvent.click(loader);
        expect(screen.getByText(toast_message)).toBeInTheDocument();
    });

    it('should show the tap-feedback toast on the mobile loader', () => {
        (useDevice as jest.Mock).mockReturnValue({ isMobile: true });
        render(<TradeLoader />);
        fireEvent.click(screen.getByTestId('dt_trade_loader'));
        expect(screen.getByText(toast_message)).toBeInTheDocument();
    });
});
