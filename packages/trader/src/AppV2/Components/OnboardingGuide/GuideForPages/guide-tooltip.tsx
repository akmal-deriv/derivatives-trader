import React from 'react';
import { TooltipRenderProps } from 'react-joyride';

import { LabelPairedXmarkSmBoldIcon } from '@deriv/quill-icons';
import { Button, CaptionText, IconButton } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

export interface GuideTooltipProps extends TooltipRenderProps {
    setStepIndex: React.Dispatch<React.SetStateAction<number>>;
}

const GuideTooltip = ({ isLastStep, primaryProps, skipProps, step, tooltipProps, setStepIndex }: GuideTooltipProps) => {
    const button_label = isLastStep ? <Localize i18n_default_text='Done' /> : <Localize i18n_default_text='Next' />;
    return (
        <div {...tooltipProps} className='guide-tooltip__wrapper'>
            <div>
                {step.title && (
                    <div className='guide-tooltip__header'>
                        <CaptionText bold className='guide-tooltip__header__title'>
                            {step.title}
                        </CaptionText>
                        <IconButton
                            onClick={skipProps.onClick}
                            icon={
                                <LabelPairedXmarkSmBoldIcon
                                    fill='var(--component-textIcon-inverse-prominent)'
                                    key='close-button'
                                />
                            }
                            className='guide-tooltip__close'
                            size='sm'
                            color='white-black'
                            variant='tertiary'
                        />
                    </div>
                )}
                {step.content && <CaptionText className='guide-tooltip__content'>{step.content}</CaptionText>}
            </div>
            <Button
                onClick={e => {
                    setStepIndex((prev: number) => prev + 1);
                    primaryProps.onClick(e);
                }}
                color='white-black'
                className='guide-tooltip__button'
                variant='secondary'
                size='sm'
                label={button_label}
            />
        </div>
    );
};

export default GuideTooltip;
