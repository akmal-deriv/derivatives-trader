import React from 'react';

import { act, render, screen } from '@testing-library/react';

import InputPopover from '../input-popover';
import { PopoverPlacement } from '../types';

const TRIGGER_RECT = { top: 56, bottom: 56, left: 80, right: 80, width: 0, height: 0, x: 80, y: 56 };

const Wrapper = ({ placement = 'bottom' as PopoverPlacement, spacing = 8 }) => {
    const trigger_ref = React.useRef<HTMLButtonElement>(null);
    return (
        <>
            <button ref={trigger_ref}>trigger</button>
            <InputPopover
                isOpen
                onClose={jest.fn()}
                triggerRef={trigger_ref}
                placement={placement}
                popoverWidth={900}
                spacing={spacing}
            >
                <div>panel content</div>
            </InputPopover>
        </>
    );
};

const setViewportHeight = (height: number) => {
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true });
};

// The popover is a plain div with no role/label, so reach it from the content it wraps.
// eslint-disable-next-line testing-library/no-node-access
const getPopover = () => screen.getByText('panel content').parentElement as HTMLElement;

describe('InputPopover', () => {
    beforeEach(() => {
        jest.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue(TRIGGER_RECT as DOMRect);
        setViewportHeight(1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('caps its height at the space left below it so a tall panel is not cut off by the viewport', () => {
        // Opens at 56 (trigger bottom) + 8 (spacing) = 64; 1000 - 64 - 8 = 928 left below it.
        render(<Wrapper />);
        expect(getPopover()).toHaveStyle({ top: '64px', maxHeight: '928px' });
    });

    it('recalculates the cap when the viewport is resized shorter', () => {
        render(<Wrapper />);

        setViewportHeight(700);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(getPopover()).toHaveStyle({ maxHeight: '628px' });
    });

    it('caps against the trigger top for the default left placement', () => {
        render(<Wrapper placement='left' />);
        expect(getPopover()).toHaveStyle({ top: '56px', maxHeight: '936px' });
    });
});
