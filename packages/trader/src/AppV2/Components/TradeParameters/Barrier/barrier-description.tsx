import React from 'react';

import { Localize } from '@deriv-com/translations';
import { ActionSheet, Text } from '@deriv-com/quill-ui';

const BarrierDescription = ({ isDays, is_turbos }: { isDays: boolean; is_turbos?: boolean }) => {
    if (is_turbos) {
        return (
            <ActionSheet.Content className='barrier-params__description-content'>
                <Text>
                    <Localize i18n_default_text="This is the corresponding price level based on the payout per point you've selected. If this barrier is ever breached, your contract would be terminated." />
                </Text>
            </ActionSheet.Content>
        );
    }

    return (
        <ActionSheet.Content className='barrier-params__description-content'>
            {isDays ? (
                <div className='content-section'>
                    <Text bold>
                        <Localize i18n_default_text='Fixed barrier:' />
                    </Text>
                    <Text>
                        <Localize i18n_default_text='Barrier set at specific price.' />
                    </Text>
                </div>
            ) : (
                <>
                    <div className='content-section'>
                        <Text bold>
                            <Localize i18n_default_text='Above spot:' />
                        </Text>
                        <Text>
                            <Localize i18n_default_text='Barrier set above spot price.' />
                        </Text>
                    </div>
                    <div className='content-section'>
                        <Text bold>
                            <Localize i18n_default_text='Below spot:' />
                        </Text>
                        <Text>
                            <Localize i18n_default_text='Barrier set below spot price.' />
                        </Text>
                    </div>
                    <div className='content-section'>
                        <Text bold>
                            <Localize i18n_default_text='Fixed barrier:' />
                        </Text>
                        <Text>
                            <Localize i18n_default_text='Barrier set at specific price.' />
                        </Text>
                    </div>
                </>
            )}
        </ActionSheet.Content>
    );
};

export default BarrierDescription;
