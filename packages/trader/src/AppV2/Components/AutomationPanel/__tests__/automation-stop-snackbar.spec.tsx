import { render } from '@testing-library/react';

import { mockStore } from '@deriv/stores';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';
import AutomationStore from 'Stores/Modules/Trading/automation-store';
import { useAutomationStore } from 'Stores/useAutomationStore';
import { TRootStore } from 'Types';

import AutomationStopSnackbar from '../automation-stop-snackbar';

const mockAddSnackbar = jest.fn();

jest.mock('@deriv-com/quill-ui', () => ({
    useSnackbar: () => ({ addSnackbar: mockAddSnackbar }),
}));

jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
}));

jest.mock('../automation-stop-message', () => ({
    getAutomationStopMessage: jest.fn(() => 'The stake is outside the allowed limits. Automation stopped.'),
}));

jest.mock('Stores/useAutomationStore', () => ({
    useAutomationStore: jest.fn(),
}));

describe('AutomationStopSnackbar', () => {
    let store: AutomationStore;

    const setStopEvent = (overrides: Partial<AutomationStore['last_stop_event']> = {}) => {
        store.last_stop_event = {
            run_id: 'run-1',
            stop_reason: 'condition_triggered',
            code: 'StopLoss',
            ...overrides,
        } as AutomationStore['last_stop_event'];
    };

    beforeEach(() => {
        jest.clearAllMocks();
        const root = mockStore({ client: { loginid: 'CR1' } }) as unknown as TRootStore;
        store = new AutomationStore({ root_store: root });
        (useAutomationStore as jest.Mock).mockImplementation(() => store);
    });

    it('announces a triggered stop condition once, with an auto-dismiss delay and a close button', () => {
        setStopEvent();
        render(<AutomationStopSnackbar />);

        expect(mockAddSnackbar).toHaveBeenCalledTimes(1);
        expect(mockAddSnackbar).toHaveBeenCalledWith(
            expect.objectContaining({ hasCloseButton: true, delay: ERROR_SNACKBAR_DURATION })
        );
    });

    it('acknowledges the event on the store so it is not replayed', () => {
        setStopEvent();
        render(<AutomationStopSnackbar />);

        expect(store.last_stop_event).toBeNull();
    });

    it('does not re-announce the same stop after a remount', () => {
        // Regression (#893): navigating to Reports unmounts the trader module, which
        // resets the component-local dedupe ref while the store singleton survives.
        // The message was re-raised on every return to the trade/automate page.
        setStopEvent();
        const { unmount } = render(<AutomationStopSnackbar />);
        expect(mockAddSnackbar).toHaveBeenCalledTimes(1);

        unmount();
        render(<AutomationStopSnackbar />);

        expect(mockAddSnackbar).toHaveBeenCalledTimes(1);
    });

    it('announces a BE-triggered stop error as a dismissible fail snackbar', () => {
        setStopEvent({ stop_reason: 'error', code: 'InvalidtoBuy(StakeLimits)' } as AutomationStore['last_stop_event']);
        render(<AutomationStopSnackbar />);

        expect(mockAddSnackbar).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'fail', hasCloseButton: true, delay: ERROR_SNACKBAR_DURATION })
        );
        expect(store.last_stop_event).toBeNull();
    });

    it('acknowledges an unrecognised stop code even though nothing is shown', () => {
        setStopEvent({ code: 'SomethingUnmapped' } as AutomationStore['last_stop_event']);
        render(<AutomationStopSnackbar />);

        expect(mockAddSnackbar).not.toHaveBeenCalled();
        expect(store.last_stop_event).toBeNull();
    });

    it('announces a new run’s stop event after an earlier one was acknowledged', () => {
        setStopEvent();
        const { unmount } = render(<AutomationStopSnackbar />);
        unmount();

        setStopEvent({ run_id: 'run-2' });
        render(<AutomationStopSnackbar />);

        expect(mockAddSnackbar).toHaveBeenCalledTimes(2);
    });
});
