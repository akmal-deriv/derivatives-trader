import Cookies from 'js-cookie';

import * as brandUtils from '../../brand';
import { getAccountId, getAccountType, getSocketURL } from '../config';

// Mock the brand utils module
jest.mock('../../brand', () => ({
    ...jest.requireActual('../../brand'),
    getWebSocketURL: jest.fn(),
}));

// Mock js-cookie so we can drive the shared `options_account_id` session cookie
jest.mock('js-cookie', () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
}));

const mockGetWebSocketURL = brandUtils.getWebSocketURL as jest.Mock;
const mockCookiesGet = Cookies.get as unknown as jest.Mock;

// Helper to set the `options_account_id` cookie (a plain account_id string), or clear it with null
const setOptionsAccountIdCookie = (account_id: string | null) => {
    mockCookiesGet.mockImplementation((name?: string) =>
        name === 'options_account_id' && account_id ? account_id : undefined
    );
};

// Helper function to create localStorage mock
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
};

// Helper function to mock window.location
const mockLocation = (originalLocation: Location, overrides: Partial<Location>) => {
    delete (window as any).location;
    window.location = {
        ...originalLocation,
        ...overrides,
    } as Location;
};

describe('getAccountType', () => {
    let originalLocation: Location, originalLocalStorage: Storage;

    beforeEach(() => {
        originalLocation = window.location;
        originalLocalStorage = window.localStorage;

        Object.defineProperty(window, 'localStorage', {
            value: createLocalStorageMock(),
            writable: true,
        });

        window.history.replaceState = jest.fn();
        // Default: no session cookie. clearAllMocks() keeps mock implementations, so reset explicitly.
        mockCookiesGet.mockReset();
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
        });
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
        });
        jest.clearAllMocks();
    });

    it('should return "demo" from URL parameter and store it in localStorage', () => {
        mockLocation(originalLocation, {
            search: '?account_type=demo',
            href: 'https://staging-dtrader.deriv.com?account_type=demo',
            pathname: '/',
        });

        const result = getAccountType();

        expect(result).toBe('demo');
        expect(window.localStorage.getItem('account_type')).toBe('demo');
        expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title, '/');
    });

    it('should return "real" from URL parameter and store it in localStorage', () => {
        mockLocation(originalLocation, {
            search: '?account_type=real',
            href: 'https://staging-dtrader.deriv.com?account_type=real',
            pathname: '/',
        });

        const result = getAccountType();

        expect(result).toBe('real');
        expect(window.localStorage.getItem('account_type')).toBe('real');
        expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title, '/');
    });

    it('should return "real" from URL parameter and override demo in localStorage', () => {
        window.localStorage.setItem('account_type', 'demo');
        mockLocation(originalLocation, {
            search: '?account_type=real',
            href: 'https://staging-dtrader.deriv.com?account_type=real',
            pathname: '/',
        });

        const result = getAccountType();

        expect(result).toBe('real');
        expect(window.localStorage.getItem('account_type')).toBe('real');
        expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title, '/');
    });

    it('should return value from localStorage when URL parameter is missing', () => {
        window.localStorage.setItem('account_type', 'real');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://staging-dtrader.deriv.com',
        });

        const result = getAccountType();

        expect(result).toBe('real');
    });

    it('should return "public" as default when no URL parameter or localStorage value exists', () => {
        mockLocation(originalLocation, {
            search: '',
            href: 'https://staging-dtrader.deriv.com',
        });

        const result = getAccountType();

        expect(result).toBe('public');
    });

    it('should return "public" as default when URL parameter is invalid', () => {
        mockLocation(originalLocation, {
            search: '?account_type=invalid',
            href: 'https://staging-dtrader.deriv.com?account_type=invalid',
            pathname: '/',
        });

        const result = getAccountType();

        expect(result).toBe('public');
        // replaceState should NOT be called for invalid account_type values
        expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('should derive "demo" from a virtual (VR*) session cookie account_id and persist it', () => {
        setOptionsAccountIdCookie('VRTC1234');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        const result = getAccountType();

        expect(result).toBe('demo');
        expect(window.localStorage.getItem('account_type')).toBe('demo');
    });

    it('should derive "real" from a non-virtual (CR*) session cookie account_id and persist it', () => {
        setOptionsAccountIdCookie('CR901234');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        const result = getAccountType();

        expect(result).toBe('real');
        expect(window.localStorage.getItem('account_type')).toBe('real');
    });

    it('should prefer localStorage over the session cookie', () => {
        window.localStorage.setItem('account_type', 'real');
        setOptionsAccountIdCookie('VRTC1234');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        expect(getAccountType()).toBe('real');
    });

    it('should return "public" when there is no URL param, localStorage value, or cookie', () => {
        setOptionsAccountIdCookie(null);
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        expect(getAccountType()).toBe('public');
    });

    it('should derive account_type from the account_id, not the cookie, when they belong to different accounts', () => {
        // Cookie belongs to a demo (VR*) account, but the URL pins a real (CR*) account_id.
        // account_type must follow the account_id actually in use, not the unrelated cookie.
        setOptionsAccountIdCookie('VRTC456');
        mockLocation(originalLocation, {
            search: '?account_id=CR123',
            href: 'https://dtrader.deriv.com?account_id=CR123',
            pathname: '/',
        });

        expect(getAccountType()).toBe('real');
    });
});

describe('getAccountId', () => {
    let originalLocation: Location, originalLocalStorage: Storage;

    beforeEach(() => {
        originalLocation = window.location;
        originalLocalStorage = window.localStorage;

        Object.defineProperty(window, 'localStorage', {
            value: createLocalStorageMock(),
            writable: true,
        });

        window.history.replaceState = jest.fn();
        mockCookiesGet.mockReset();
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
        });
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
        });
        jest.clearAllMocks();
    });

    it('should return account_id from the URL param, persist it, and strip it from the URL', () => {
        mockLocation(originalLocation, {
            search: '?account_id=CR111',
            href: 'https://dtrader.deriv.com?account_id=CR111',
            pathname: '/',
        });

        const result = getAccountId();

        expect(result).toBe('CR111');
        expect(window.localStorage.getItem('account_id')).toBe('CR111');
        expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title, '/');
    });

    it('should prefer the URL param over both localStorage and the session cookie', () => {
        window.localStorage.setItem('account_id', 'CR222');
        setOptionsAccountIdCookie('CR333');
        mockLocation(originalLocation, {
            search: '?account_id=CR111',
            href: 'https://dtrader.deriv.com?account_id=CR111',
            pathname: '/',
        });

        expect(getAccountId()).toBe('CR111');
    });

    it('should prefer localStorage over the session cookie', () => {
        window.localStorage.setItem('account_id', 'CR222');
        setOptionsAccountIdCookie('CR333');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        expect(getAccountId()).toBe('CR222');
    });

    it('should fall back to the session cookie account_id and persist it to localStorage', () => {
        setOptionsAccountIdCookie('CR333');
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        const result = getAccountId();

        expect(result).toBe('CR333');
        expect(window.localStorage.getItem('account_id')).toBe('CR333');
    });

    it('should return null when there is no URL param, localStorage value, or cookie', () => {
        setOptionsAccountIdCookie(null);
        mockLocation(originalLocation, {
            search: '',
            href: 'https://dtrader.deriv.com',
        });

        expect(getAccountId()).toBeNull();
    });
});

describe('getSocketURL', () => {
    let originalLocation: Location, originalLocalStorage: Storage;

    beforeEach(() => {
        originalLocation = window.location;
        originalLocalStorage = window.localStorage;

        Object.defineProperty(window, 'localStorage', {
            value: createLocalStorageMock(),
            writable: true,
        });

        window.history.replaceState = jest.fn();
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
        });
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
        });
        jest.clearAllMocks();
    });

    it('should return server URL for staging environment', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=demo',
            href: 'https://staging-dtrader.deriv.com?account_type=demo',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL for staging with real account', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=real',
            href: 'https://staging-dtrader.deriv.com?account_type=real',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL for staging with missing account_type', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '',
            href: 'https://staging-dtrader.deriv.com',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL for staging with invalid account_type', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=invalid',
            href: 'https://staging-dtrader.deriv.com?account_type=invalid',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL for production with demo account', () => {
        mockGetWebSocketURL.mockReturnValue('core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'dtrader.deriv.com',
            search: '?account_type=demo',
            href: 'https://dtrader.deriv.com?account_type=demo',
        });

        const result = getSocketURL();

        expect(result).toBe('core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL for production with real account', () => {
        mockGetWebSocketURL.mockReturnValue('core.api.deriv.com/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'dtrader.deriv.com',
            search: '?account_type=real',
            href: 'https://dtrader.deriv.com?account_type=real',
        });

        const result = getSocketURL();

        expect(result).toBe('core.api.deriv.com/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return localStorage value when config.server_url is set', () => {
        window.localStorage.setItem('config.server_url', 'custom.server.com');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=real',
            href: 'https://staging-dtrader.deriv.com?account_type=real',
        });

        const result = getSocketURL();

        expect(result).toBe('custom.server.com');
    });

    it('should ignore and remove invalid localStorage server URL', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        window.localStorage.setItem('config.server_url', 'https://malicious.com');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=demo',
            href: 'https://staging-dtrader.deriv.com?account_type=demo',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(window.localStorage.getItem('config.server_url')).toBeNull();
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should ignore and remove invalid localStorage server URL without TLD', () => {
        mockGetWebSocketURL.mockReturnValue('staging-core.api.deriv.com/options/v1/ws');
        window.localStorage.setItem('config.server_url', 'localhost');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.com',
            search: '?account_type=real',
            href: 'https://staging-dtrader.deriv.com?account_type=real',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-core.api.deriv.com/options/v1/ws');
        expect(window.localStorage.getItem('config.server_url')).toBeNull();
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL on dtrader.deriv.be', () => {
        mockGetWebSocketURL.mockReturnValue('api-core.deriv.be/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'dtrader.deriv.be',
            search: '',
            href: 'https://dtrader.deriv.be',
        });

        const result = getSocketURL();

        expect(result).toBe('api-core.deriv.be/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL on dtrader.deriv.me', () => {
        mockGetWebSocketURL.mockReturnValue('api-core.deriv.me/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'dtrader.deriv.me',
            search: '',
            href: 'https://dtrader.deriv.me',
        });

        const result = getSocketURL();

        expect(result).toBe('api-core.deriv.me/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });

    it('should return server URL on staging-dtrader.deriv.be', () => {
        mockGetWebSocketURL.mockReturnValue('staging-api-core.deriv.be/options/v1/ws');
        mockLocation(originalLocation, {
            hostname: 'staging-dtrader.deriv.be',
            search: '',
            href: 'https://staging-dtrader.deriv.be',
        });

        const result = getSocketURL();

        expect(result).toBe('staging-api-core.deriv.be/options/v1/ws');
        expect(mockGetWebSocketURL).toHaveBeenCalled();
    });
});
