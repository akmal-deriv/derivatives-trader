import React from 'react';

/**
 * SmartCharts wires barrier dragging to mouse events only: `mousedown` on the barrier
 * element, `mousemove` on `window` and `mouseup` on `.ciq-chart-area`. Touch devices never
 * emit `mousemove` while a finger is down, so the draggable (blue) barrier cannot be moved
 * on mobile even though it is marked as draggable. The ChartIQ-based chart used to handle
 * touch itself; that was lost when the chart moved to the Flutter renderer.
 *
 * This hook bridges the gap by translating a single-finger gesture that starts on a
 * draggable barrier into exactly the mouse events SmartCharts listens for.
 */

const BARRIER_SELECTOR = '.barrier-area';
const DRAGGABLE_LINE_SELECTOR = '.chart-line.draggable';
const CHART_AREA_SELECTOR = '.ciq-chart-area';

type TMouseEventType = 'mousedown' | 'mousemove' | 'mouseup';

const dispatchMouseEvent = (target: EventTarget | null, type: TMouseEventType, touch: Touch) => {
    target?.dispatchEvent(
        new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
            buttons: type === 'mouseup' ? 0 : 1,
        })
    );
};

const useBarrierTouchDrag = () => {
    React.useEffect(() => {
        let is_dragging = false;
        let chart_area: Element | null = null;

        const endDrag = (touch: Touch) => {
            dispatchMouseEvent(chart_area, 'mouseup', touch);
            is_dragging = false;
            chart_area = null;
        };

        const onTouchStart = (event: TouchEvent) => {
            if (is_dragging || event.touches.length !== 1) return;

            const target = event.target as HTMLElement | null;
            const barrier = target?.closest?.(BARRIER_SELECTOR);
            // Non-draggable barriers (e.g. Turbos/Vanilla) render without the draggable modifier.
            if (!barrier?.querySelector(DRAGGABLE_LINE_SELECTOR)) return;

            chart_area = document.querySelector(CHART_AREA_SELECTOR);
            if (!chart_area) return;

            is_dragging = true;
            dispatchMouseEvent(target, 'mousedown', event.touches[0]);
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!is_dragging) return;
            // A second finger means the user is pinching the chart, not dragging the barrier.
            if (event.touches.length !== 1) {
                endDrag(event.touches[0] ?? event.changedTouches[0]);
                return;
            }
            // Keep the page and the chart from panning while the barrier follows the finger.
            if (event.cancelable) event.preventDefault();
            dispatchMouseEvent(window, 'mousemove', event.touches[0]);
        };

        const onTouchEnd = (event: TouchEvent) => {
            if (!is_dragging) return;
            endDrag(event.changedTouches[0]);
        };

        document.addEventListener('touchstart', onTouchStart, true);
        document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        document.addEventListener('touchend', onTouchEnd, true);
        document.addEventListener('touchcancel', onTouchEnd, true);

        return () => {
            document.removeEventListener('touchstart', onTouchStart, true);
            document.removeEventListener('touchmove', onTouchMove, true);
            document.removeEventListener('touchend', onTouchEnd, true);
            document.removeEventListener('touchcancel', onTouchEnd, true);
        };
    }, []);
};

export default useBarrierTouchDrag;
