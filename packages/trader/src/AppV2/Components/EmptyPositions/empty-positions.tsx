import React from 'react';
import { useHistory } from 'react-router-dom';

import { StandaloneSearchFillIcon } from '@deriv/quill-icons';
import { routes } from '@deriv/shared';
import { Button, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { TAB_NAME } from 'AppV2/Utils/positions-utils';
import EmptyPositionsIllustration from 'Assets/SvgComponents/positions/empty-positions.svg';

export type TEmptyPositionsProps = {
    isClosedTab?: boolean;
    noMatchesFound?: boolean;
};

const EmptyPositions = ({ isClosedTab, noMatchesFound }: TEmptyPositionsProps) => {
    const history = useHistory();
    const rootClassName = `empty-positions__${isClosedTab ? TAB_NAME.CLOSED.toLowerCase() : TAB_NAME.OPEN.toLowerCase()}`;

    // Filtered state: unchanged — search glyph, terse copy, no CTA.
    if (noMatchesFound) {
        return (
            <div className={rootClassName}>
                <div className='icon' data-testid='dt_empty_state_icon'>
                    <StandaloneSearchFillIcon iconSize='2xl' />
                </div>
                <div className='message'>
                    <Text bold size='lg' color='quill-typography__color--subtle'>
                        <Localize i18n_default_text='No matches found' />
                    </Text>
                    <Text size='sm' centered color='quill-typography__color--subtle'>
                        <Localize i18n_default_text='Try changing or removing filters to view available positions.' />
                    </Text>
                </div>
            </div>
        );
    }

    // No positions at all: illustration, tightened copy, and — on the Open tab
    // only — a "Start trading" CTA, matching the mobile app (#1081).
    return (
        <div className={rootClassName}>
            <div className='icon icon--illustration' data-testid='dt_empty_state_icon'>
                <EmptyPositionsIllustration />
            </div>
            <div className='message'>
                <Text bold size='xl'>
                    {isClosedTab ? (
                        <Localize i18n_default_text='No closed positions' />
                    ) : (
                        <Localize i18n_default_text='No open positions' />
                    )}
                </Text>
                <Text size='md' centered color='quill-typography__color--subtle'>
                    {isClosedTab ? (
                        <Localize i18n_default_text='Your closed positions will be shown here.' />
                    ) : (
                        <Localize i18n_default_text='Your active trades will appear here.' />
                    )}
                </Text>
            </div>
            {!isClosedTab && (
                <Button
                    className='empty-positions__cta'
                    variant='secondary'
                    color='black-white'
                    size='md'
                    label={<Localize i18n_default_text='Start trading' />}
                    onClick={() => history.push(routes.index)}
                />
            )}
        </div>
    );
};

export default EmptyPositions;
