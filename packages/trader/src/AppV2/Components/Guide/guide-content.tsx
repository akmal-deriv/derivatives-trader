import React from 'react';
import clsx from 'clsx';

import { Chip, Text } from '@deriv-com/quill-ui';

import FireIcon from 'AppV2/Components/FireIcon';

import TradeDescription from './Description/trade-description';
import VideoPreview from './Description/video-preview';

type TGuideContent = {
    contract_list: { tradeType: React.ReactNode; id: string; show_fire_icon?: boolean }[];
    onChipSelect: (id: string) => void;
    onTermClick: (term: string) => void;
    selected_contract_type: string;
    show_guide_for_selected_contract?: boolean;
    show_description_in_a_modal?: boolean;
    show_all_trade_types_in_guide?: boolean;
    toggleVideoPlayer?: (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
    video_src: string;
};

const GuideContent = ({
    contract_list,
    onChipSelect,
    onTermClick,
    selected_contract_type,
    show_guide_for_selected_contract,
    show_description_in_a_modal = true,
    show_all_trade_types_in_guide,
    toggleVideoPlayer,
    video_src,
}: TGuideContent) => {
    // Bring the selected chip into view once on open — it can sit off-screen in the scrolled row.
    // Chips are direct children of the menu, so index the DOM node rather than ref each Chip.
    const menu_ref = React.useRef<HTMLDivElement>(null);
    const has_scrolled_ref = React.useRef(false);
    React.useEffect(() => {
        if (has_scrolled_ref.current) return;
        const index = contract_list.findIndex(contract => contract.id === selected_contract_type);
        const chip = index >= 0 ? (menu_ref.current?.children[index] as HTMLElement | undefined) : undefined;
        if (!chip) return;
        has_scrolled_ref.current = true;
        chip.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }, [selected_contract_type, contract_list]);

    return (
        <React.Fragment>
            {(show_all_trade_types_in_guide || !show_guide_for_selected_contract) && (
                <div className='guide__menu' ref={menu_ref}>
                    {contract_list.map(
                        ({
                            tradeType,
                            id,
                            show_fire_icon,
                        }: {
                            tradeType: React.ReactNode;
                            id: string;
                            show_fire_icon?: boolean;
                        }) => (
                            <Chip.Selectable
                                key={id}
                                onChipSelect={() => onChipSelect(id)}
                                selected={id === selected_contract_type}
                            >
                                <Text size='sm'>
                                    {tradeType}
                                    {show_fire_icon && <FireIcon />}
                                </Text>
                            </Chip.Selectable>
                        )
                    )}
                </div>
            )}
            <div
                className={clsx('guide__contract-description', {
                    'guide__contract-description--without-btn': !show_description_in_a_modal,
                })}
                key={selected_contract_type}
            >
                <TradeDescription contract_type={selected_contract_type} onTermClick={onTermClick} />
                <VideoPreview
                    contract_type={selected_contract_type}
                    toggleVideoPlayer={toggleVideoPlayer}
                    video_src={video_src}
                />
            </div>
        </React.Fragment>
    );
};

export default GuideContent;
