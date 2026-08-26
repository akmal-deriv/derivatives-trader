import React from 'react';

/**
 * Stops a drag that starts inside this element from reaching the action sheet.
 *
 * `shouldDetectSwipingOnContainer` binds quill's drag-to-close to the whole sheet via @use-gesture,
 * which listens through React props — so a gesture starting on a wheel picker bubbles up and
 * dismisses the sheet instead of scrolling the wheel. Only propagation is stopped, never the default,
 * so the wheel still scrolls and its items still take taps.
 *
 * Pointer and touch only. `mousedown` is redundant — browsers fire `pointerdown` for mouse input
 * too — and adding it breaks six tests, because jsdom implements no PointerEvent so @use-gesture
 * falls back to mouse events there.
 */
export const useBlockSheetSwipe = () => {
    const stopPropagation = React.useCallback((event: React.SyntheticEvent) => event.stopPropagation(), []);

    return {
        onPointerDown: stopPropagation,
        onTouchStart: stopPropagation,
    };
};

export default useBlockSheetSwipe;
