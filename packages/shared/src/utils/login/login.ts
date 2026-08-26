import { getBrandUrl, getRedirectHostname } from '../brand';

export const redirectToLogin = (language?: string) => {
    const brandUrl = getBrandUrl();
    // getRedirectHostname() returns the hostname only when it is a known brand domain,
    const platformHostname = getRedirectHostname();
    const lang_param = language ? `?lang=${encodeURIComponent(language)}` : '';
    const redirect_param = platformHostname
        ? `${lang_param ? '&' : '?'}redirect=${encodeURIComponent(platformHostname)}`
        : '';

    window.location.href = `${brandUrl}/login${lang_param}${redirect_param}`;
};

export const redirectToSignUp = (language?: string) => {
    const brandUrl = getBrandUrl();
    const lang_param = language ? `?lang=${encodeURIComponent(language)}` : '';

    window.location.href = `${brandUrl}/signup${lang_param}`;
};
