import { renderHook } from '@testing-library/react-hooks';

import useIsAutomationEnabled from '../useIsAutomationEnabled';
import useIsEuAccount from '../useIsEuAccount';

jest.mock('../useIsEuAccount', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockUseIsEuAccount = useIsEuAccount as jest.Mock;
const AUTOMATION_CLASS = 'automation-enabled';

describe('useIsAutomationEnabled', () => {
    afterEach(() => {
        document.body.className = '';
        jest.clearAllMocks();
    });

    it('enables automation and adds the root class for non-EU accounts', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: true });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: true, is_ready: true });
        expect(document.body).toHaveClass(AUTOMATION_CLASS);
    });

    it('disables automation and does not add the root class for EU accounts', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: true, is_ready: true });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: false, is_ready: true });
        expect(document.body).not.toHaveClass(AUTOMATION_CLASS);
    });

    it('stays disabled and leaves the root class unset while the account status is loading', () => {
        // Guards against the flash: nothing is committed before is_ready resolves.
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: false });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: false, is_ready: false });
        expect(document.body).not.toHaveClass(AUTOMATION_CLASS);
    });

    it('removes the root class once a previously-enabled account resolves as EU', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: true });
        const { rerender } = renderHook(() => useIsAutomationEnabled());
        expect(document.body).toHaveClass(AUTOMATION_CLASS);

        mockUseIsEuAccount.mockReturnValue({ is_eu: true, is_ready: true });
        rerender();
        expect(document.body).not.toHaveClass(AUTOMATION_CLASS);
    });
});
