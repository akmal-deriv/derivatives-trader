import React from 'react';
import { Step } from 'react-joyride';

import { Localize } from '@deriv-com/translations';

const DESKTOP_STEPS: Step[] = [
    {
        content: (
            <Localize i18n_default_text='You can see all trade types from the grid icon, or drag left and right to explore.' />
        ),
        offset: 0,
        spotlightPadding: 4,
        target: '.trade-types-selector__button',
        title: <Localize i18n_default_text='Explore trade types' />,
        placement: 'bottom-start' as Step['placement'],
        disableScrollParentFix: true,
    },
    {
        content: <Localize i18n_default_text='View available markets here.' />,
        offset: 4,
        placement: 'bottom-start' as Step['placement'],
        spotlightPadding: 8,
        target: '.cq-chart-title',
        title: <Localize i18n_default_text='Choose a market' />,
    },
    {
        content: <Localize i18n_default_text='Track market trends with our interactive charts.' />,
        spotlightPadding: 8,
        offset: 4,
        target: '.trade__chart-tooltip',
        title: <Localize i18n_default_text='Analyse with charts' />,
        placement: 'right-start' as Step['placement'],
        floaterProps: {
            disableFlip: true,
        },
    },
    {
        content: <Localize i18n_default_text='Set your trade parameters here.' />,
        offset: 4,
        spotlightPadding: 0,
        target: '.trade-params__options-wrapper',
        title: <Localize i18n_default_text='Open your trade' />,
        placement: 'left' as Step['placement'],
        disableScrollParentFix: true,
        floaterProps: {
            disableFlip: true,
        },
    },
    {
        content: <Localize i18n_default_text='View your positions here.' />,
        offset: 4,
        target: '[data-testid="dt_sidebar_positions"]',
        title: <Localize i18n_default_text='Check your positions' />,
        placement: 'right' as Step['placement'],
    },
];

export default DESKTOP_STEPS;
