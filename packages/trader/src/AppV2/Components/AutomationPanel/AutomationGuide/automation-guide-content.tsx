import React from 'react';

import { LabelPairedCircleInfoMdRegularIcon, StandaloneCircleExclamationRegularIcon } from '@deriv/quill-icons';
import { ActionSheet, Chip, Heading, Text, Tooltip } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import type { TGuideStrategyInfo, TGuideTradeTypeInfo } from '../automation-guide-config';

type TAutomationGuideContentProps = {
    trade_type_info: TGuideTradeTypeInfo;
    visible_strategies: Array<{ id: string; info: TGuideStrategyInfo }>;
    selected_strategy_id: string;
    onStrategyChipSelect: (id: string) => void;
};

const AutomationGuideContent = ({
    trade_type_info,
    visible_strategies,
    selected_strategy_id,
    onStrategyChipSelect,
}: TAutomationGuideContentProps) => {
    const { localize } = useTranslations();
    const { isMobile } = useDevice();
    const [is_strategy_info_open, setIsStrategyInfoOpen] = React.useState(false);
    const selected_strategy = visible_strategies.find(s => s.id === selected_strategy_id) ?? visible_strategies[0];
    const has_parameters = selected_strategy && selected_strategy.info.parameters.length > 0;

    const strategy_info_text = localize(
        'Strategies are your automated trading rules. They read your chosen parameters to execute trades for you'
    );
    const strategy_info_label = localize('More info about strategies');

    const info_icon = <LabelPairedCircleInfoMdRegularIcon fill='var(--component-textIcon-normal-default)' />;

    // Desktop hovers a tooltip; mobile taps open an ActionSheet.
    const info_trigger = isMobile ? (
        <button
            type='button'
            className='automation-guide-content__info-icon'
            onClick={() => setIsStrategyInfoOpen(true)}
            aria-label={strategy_info_label}
        >
            {info_icon}
        </button>
    ) : (
        <Tooltip
            as='div'
            className='automation-guide-content__info-icon'
            tooltipContent={strategy_info_text}
            tooltipPosition='top'
            aria-label={strategy_info_label}
        >
            {info_icon}
        </Tooltip>
    );

    return (
        <div className='automation-guide-content'>
            <section className='automation-guide-content__section'>
                <Heading.H5 className='automation-guide-content__heading'>
                    <Localize
                        i18n_default_text='What is {{trade_type}}?'
                        values={{ trade_type: trade_type_info.title }}
                    />
                </Heading.H5>
                <Text size='sm' className='automation-guide-content__paragraph'>
                    {trade_type_info.description}
                </Text>
            </section>

            {selected_strategy && (
                <>
                    <hr className='automation-guide-content__divider' />
                    <section className='automation-guide-content__section'>
                        <div className='automation-guide-content__heading-row'>
                            <Heading.H5 className='automation-guide-content__heading'>
                                <Localize i18n_default_text='Strategies overview' />
                            </Heading.H5>
                            {info_trigger}
                        </div>

                        <div className='automation-guide-content__chips'>
                            {visible_strategies.map(({ id, info }) => (
                                <Chip.Selectable
                                    key={id}
                                    selected={id === selected_strategy_id}
                                    onClick={() => onStrategyChipSelect(id)}
                                >
                                    <Text size='sm'>{info.label}</Text>
                                </Chip.Selectable>
                            ))}
                        </div>

                        <Text size='sm' className='automation-guide-content__paragraph'>
                            {selected_strategy.info.description}
                        </Text>
                    </section>
                </>
            )}

            {has_parameters && (
                <>
                    <hr className='automation-guide-content__divider' />
                    <section className='automation-guide-content__section'>
                        <Heading.H5 className='automation-guide-content__heading'>
                            <Localize
                                i18n_default_text='{{count}} parameters needed'
                                values={{ count: selected_strategy.info.parameters.length }}
                            />
                        </Heading.H5>
                        <ol className='automation-guide-content__params'>
                            {selected_strategy.info.parameters.map((param, index) => (
                                <li key={param.label} className='automation-guide-content__param'>
                                    <span className='automation-guide-content__param-index'>{index + 1}</span>
                                    <div className='automation-guide-content__param-body'>
                                        <Text size='sm' bold>
                                            {param.label}
                                        </Text>
                                        <Text size='sm' className='automation-guide-content__paragraph'>
                                            {param.description}
                                        </Text>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        {selected_strategy.info.warning && (
                            <div className='automation-guide-content__warning'>
                                <StandaloneCircleExclamationRegularIcon
                                    iconSize='sm'
                                    fill='var(--component-sectionMessage-icon-warning)'
                                />
                                <Text size='sm' className='automation-guide-content__paragraph'>
                                    {selected_strategy.info.warning}
                                </Text>
                            </div>
                        )}
                    </section>
                </>
            )}

            {isMobile && (
                <ActionSheet.Root
                    isOpen={is_strategy_info_open}
                    onClose={() => setIsStrategyInfoOpen(false)}
                    expandable={false}
                    position='left'
                >
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='automation-guide__strategy-info'>
                            <Heading.H4 className='automation-guide__strategy-info-title'>
                                <Localize i18n_default_text='Strategy overview' />
                            </Heading.H4>
                            <Text size='sm'>{strategy_info_text}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            secondaryAction={{
                                content: <Localize i18n_default_text='Close' />,
                                onAction: () => setIsStrategyInfoOpen(false),
                            }}
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}
        </div>
    );
};

export default AutomationGuideContent;
