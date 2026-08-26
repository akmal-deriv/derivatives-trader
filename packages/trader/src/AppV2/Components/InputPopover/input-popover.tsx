import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import usePopoverPosition from './hooks/use-popover-position';
import { InputPopoverProps } from './types';

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

const InputPopover = React.memo(
    ({
        isOpen,
        onClose,
        triggerRef,
        children,
        className,
        popoverWidth = 240,
        spacing = 16,
        placement = 'left',
    }: InputPopoverProps) => {
        const position = usePopoverPosition({
            triggerRef,
            isOpen,
            popoverWidth,
            spacing,
            placement,
        });

        const style = React.useMemo(
            () => ({
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${popoverWidth}px`,
                // Skipped until the first measure, so the panel is never briefly collapsed to 0.
                ...(position.maxHeight ? { maxHeight: `${position.maxHeight}px` } : {}),
            }),
            [position.top, position.left, position.maxHeight, popoverWidth]
        );

        if (!isOpen || typeof document === 'undefined') return null;

        // Render through a portal to document.body so the position:fixed overlay/panel are not
        // descendants of the trigger's `overflow`/`sticky` ancestors. Safari (unlike Chrome) clips
        // a fixed descendant to such an ancestor's box, which hid the popover entirely; portaling
        // it out keeps the fixed positioning anchored to the viewport in every browser.
        return createPortal(
            <div className='input-popover-overlay' onClick={onClose}>
                <div className={clsx('input-popover', className)} onClick={stopPropagation} style={style}>
                    {children}
                </div>
            </div>,
            document.body
        );
    }
);
InputPopover.displayName = 'InputPopover';

export default InputPopover;
