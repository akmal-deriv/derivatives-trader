import React from 'react';
import clsx from 'clsx';

import { Localize } from '@deriv-com/translations';

export interface HorizontalTabItem {
    value: string;
    label: string;
}

interface HorizontalTabSelectorProps {
    items: HorizontalTabItem[];
    selectedValue: string;
    onSelect: (value: string) => void;
    className?: string;
}

const HorizontalTabSelector: React.FC<HorizontalTabSelectorProps> = ({ items, selectedValue, onSelect, className }) => {
    const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                break;
            case 'ArrowRight':
                event.preventDefault();
                nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = items.length - 1;
                break;
            default:
                return;
        }

        onSelect(items[nextIndex].value);
    };

    return (
        <div className={clsx('horizontal-tab-selector', className)} role='tablist' aria-orientation='horizontal'>
            {items.map((item, index) => (
                <button
                    key={item.value}
                    className={clsx('horizontal-tab-selector__item', {
                        'horizontal-tab-selector__item--selected': selectedValue === item.value,
                    })}
                    onClick={() => onSelect(item.value)}
                    onKeyDown={e => handleKeyDown(e, index)}
                    type='button'
                    role='tab'
                    aria-selected={selectedValue === item.value}
                    tabIndex={selectedValue === item.value ? 0 : -1}
                >
                    <Localize i18n_default_text={item.label} />
                </button>
            ))}
        </div>
    );
};

export default HorizontalTabSelector;
