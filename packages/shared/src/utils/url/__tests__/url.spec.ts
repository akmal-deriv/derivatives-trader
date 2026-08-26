import { getStaticUrl, setUrlLanguage } from '../url';

describe('getStaticUrl', () => {
    beforeEach(() => {
        // Reset to default language between cases
        setUrlLanguage('EN');
    });

    it('builds document links on the documents host, not the home dashboard', () => {
        // Regression: previously resolved to the home dashboard (home.deriv.com/dashboard/...)
        // via getBrandUrl(), which is a dead page. Legal documents live on docs.deriv.com —
        // the content site only 301-redirects there, so link straight to the document host.
        expect(getStaticUrl('tnc/trading-terms.pdf', true)).toBe('https://docs.deriv.com/tnc/trading-terms.pdf');
    });

    it('builds regular content links on the deriv.com content site', () => {
        // normalizePath strips leading/trailing slashes
        expect(getStaticUrl('/help-centre/')).toBe('https://deriv.com/help-centre');
    });

    it('does not include a language segment for documents', () => {
        setUrlLanguage('ES');
        expect(getStaticUrl('tnc/trading-terms.pdf', true)).toBe('https://docs.deriv.com/tnc/trading-terms.pdf');
    });

    it('prefixes non-English language for non-document links', () => {
        setUrlLanguage('ES');
        expect(getStaticUrl('/responsible')).toBe('https://deriv.com/es/responsible');
    });

    it('keeps documents on the documents host of the current brand domain', () => {
        const original_location = Object.getOwnPropertyDescriptor(window, 'location');
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { hostname: 'dtrader.deriv.be' },
            writable: true,
        });

        expect(getStaticUrl('tnc/trading-terms.pdf', true)).toBe('https://docs.deriv.be/tnc/trading-terms.pdf');

        if (original_location) Object.defineProperty(window, 'location', original_location);
    });
});
