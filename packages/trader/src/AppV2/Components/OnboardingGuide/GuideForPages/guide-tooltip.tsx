import clsx from 'clsx';
import { TooltipRenderProps } from 'react-joyride';

import { LabelPairedXmarkSmBoldIcon } from '@deriv/quill-icons';
import { Button, CaptionText, IconButton } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

export interface GuideTooltipProps extends TooltipRenderProps {
    /** Advance the tour by one step (GuideContainer runs any `prepare` hook + waits for the anchor). */
    onNext: (index: number) => void;
    /** Finish/skip the tour. */
    onClose: () => void;
}

const GuideTooltip = ({ index, isLastStep, step, tooltipProps, onNext, onClose }: GuideTooltipProps) => {
    const button_label = isLastStep ? <Localize i18n_default_text='Done' /> : <Localize i18n_default_text='Next' />;
    // The 'center'-placed step is the mobile full-page-selector callout, pinned to the bottom. Widen
    // it so the copy reads as a short, wide rectangle (per design) rather than a narrow, square card.
    const is_bottom_callout = step.placement === 'center';
    return (
        <div
            {...tooltipProps}
            className={clsx('guide-tooltip__wrapper', is_bottom_callout && 'guide-tooltip__wrapper--bottom')}
        >
            <div className='guide-tooltip__body'>
                {step.title && (
                    <div className='guide-tooltip__header'>
                        <CaptionText bold className='guide-tooltip__header__title'>
                            {step.title}
                        </CaptionText>
                        <IconButton
                            onClick={onClose}
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
                onClick={() => (isLastStep ? onClose() : onNext(index))}
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
