import { renderHook } from '@testing-library/react-hooks';

import useIsAutomationEnabled from '../useIsAutomationEnabled';
import useIsEuAccount from '../useIsEuAccount';

jest.mock('../useIsEuAccount', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockUseIsEuAccount = useIsEuAccount as jest.Mock;

describe('useIsAutomationEnabled', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('enables automation for non-EU accounts', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: true });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: true, is_ready: true });
    });

    it('disables automation for EU accounts', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: true, is_ready: true });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: false, is_ready: true });
    });

    it('stays disabled while the account status is loading', () => {
        // Guards against the flash: nothing is committed before is_ready resolves.
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: false });
        const { result } = renderHook(() => useIsAutomationEnabled());
        expect(result.current).toEqual({ is_enabled: false, is_ready: false });
    });

    it('disables automation once a previously-enabled account resolves as EU', () => {
        mockUseIsEuAccount.mockReturnValue({ is_eu: false, is_ready: true });
        const { result, rerender } = renderHook(() => useIsAutomationEnabled());
        expect(result.current.is_enabled).toBe(true);

        mockUseIsEuAccount.mockReturnValue({ is_eu: true, is_ready: true });
        rerender();
        expect(result.current.is_enabled).toBe(false);
    });
});
