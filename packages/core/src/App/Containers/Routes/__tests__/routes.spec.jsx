import React from 'react';
import { BrowserRouter, useHistory } from 'react-router-dom';

import { mockStore, StoreProvider } from '@deriv/stores';
import { act, render } from '@testing-library/react';

import Routes from '../routes.jsx';

jest.mock('App/Components/Routes', () => {
    const BinaryRoutesMock = () => <div>BinaryRoutes</div>;
    return BinaryRoutesMock;
});

// Pinned to a language that never matches the store's, so any reconciliation reading the i18n
// language instead of `common.current_language` writes the wrong value and fails loudly.
const I18N_LANG = 'AR';
jest.mock('@deriv-com/translations', () => ({
    ...jest.requireActual('@deriv-com/translations'),
    useTranslations: () => ({ currentLang: 'AR', switchLanguage: jest.fn(), localize: s => s }),
}));

const getStore = current_language =>
    mockStore({
        common: {
            current_language,
            setAppRouterHistory: jest.fn(),
            addRouteHistoryItem: jest.fn(),
            setInitialRouteHistoryItem: jest.fn(),
        },
    });

let router_history;
const CaptureHistory = () => {
    router_history = useHistory();
    return null;
};

/**
 * Renders through a BrowserRouter so react-router and the component share the real
 * `window.location` — the point of the fix is which of the two it reads.
 */
const mountRoutes = current_language => {
    const tree = next_language => (
        <BrowserRouter>
            <StoreProvider store={getStore(next_language)}>
                <CaptureHistory />
                <Routes />
            </StoreProvider>
        </BrowserRouter>
    );
    const { rerender } = render(tree(current_language));
    return next_language => rerender(tree(next_language));
};

/** What `common.changeSelectedLanguage` writes to the URL, verbatim. */
const changeSelectedLanguage = key => {
    const url = new URL(window.location.href);
    if (key === 'EN') url.searchParams.delete('lang');
    else url.searchParams.set('lang', key);
    window.history.pushState({ path: url.toString() }, '', url.toString());
};

const setUrl = href => window.history.replaceState({}, '', href);

describe('<Routes /> lang URL param', () => {
    beforeEach(() => setUrl('/'));

    it('leaves a matching lang param untouched', () => {
        setUrl('/?symbol=1HZ50V&lang=AR');
        mountRoutes('AR');

        expect(window.location.search).toBe('?symbol=1HZ50V&lang=AR');
    });

    it('does not re-add the outgoing language when switching to English', () => {
        // The reported bug: AR -> EN left `lang=AR` behind. The reconciliation ran during render
        // off the i18n language — still 'AR' on the render in between — and could only detect
        // whether `lang` was present, never that its value was wrong.
        setUrl('/?symbol=1HZ50V&lang=AR');
        const switchTo = mountRoutes('AR');

        changeSelectedLanguage('EN');
        switchTo('EN');

        expect(window.location.search).toBe('?symbol=1HZ50V');
    });

    it('does not re-add the outgoing language when switching between two non-English languages', () => {
        setUrl('/?lang=AR');
        const switchTo = mountRoutes('AR');

        changeSelectedLanguage('ES');
        switchTo('ES');

        expect(window.location.search).toBe('?lang=ES');
    });

    it('restores the param after a route change drops the query string', () => {
        // react-router rebuilds the URL from a path alone, so `history.push(routes.reports)` wipes
        // every query param. The active language has to survive that.
        setUrl('/?lang=AR');
        mountRoutes('AR');

        act(() => router_history.push('/reports'));

        expect(window.location.pathname).toBe('/reports');
        expect(window.location.search).toBe('?lang=AR');
    });

    it('normalises a lower-case lang on load to what the app resolved to', () => {
        // getInitialLanguage upper-cases whatever it reads out of the URL.
        setUrl('/?lang=ar');
        mountRoutes('AR');

        expect(window.location.search).toBe('?lang=AR');
    });

    it('removes a stale lang param when the app is running English', () => {
        setUrl('/?symbol=1HZ50V&lang=AR');
        mountRoutes('EN');

        expect(window.location.search).toBe('?symbol=1HZ50V');
    });

    it('reconciles against the store language, not the i18n one', () => {
        // The two disagree for a tick on every switch: `changeSelectedLanguage` writes the URL and
        // `common.current_language` together, while the i18n language is set afterwards. Reading
        // the i18n one meant the render in between re-applied the *outgoing* language — which is
        // what left `lang=AR` in the URL when switching AR -> EN. `current_language` is the only
        // valid source here; this fails if the i18n language is reintroduced.
        expect(I18N_LANG).not.toBe('ES');
        setUrl('/');
        mountRoutes('ES');

        expect(window.location.search).toBe('?lang=ES');
    });
});
