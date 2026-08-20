import React from 'react';

import { Localize } from '@deriv-com/translations';

// Inline-safe multiplier description rendered inside the header info-icon tooltip (quill wraps tooltip
// content in a single text node, so only inline elements are used here).
const MultiplierDescription = () => (
    <Localize i18n_default_text='Multipliers amplify your potential profit if the market moves in your favour, with losses limited to your initial capital.' />
);

export default MultiplierDescription;
