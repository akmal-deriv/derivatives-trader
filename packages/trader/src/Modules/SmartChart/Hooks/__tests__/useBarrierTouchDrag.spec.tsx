import { renderHook } from '@testing-library/react-hooks';

import useBarrierTouchDrag from '../useBarrierTouchDrag';

const createTouch = (clientY: number) => ({ clientX: 50, clientY }) as Touch;

const dispatchTouch = (target: EventTarget, type: string, touches: Touch[], changed_touches = touches) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { touches, changedTouches: changed_touches });
    target.dispatchEvent(event);
    return event;
};

describe('useBarrierTouchDrag', () => {
    let chart_area: HTMLElement, barrier_area: HTMLElement, chart_line: HTMLElement, drag_handle: HTMLElement;

    const setup = ({ is_draggable = true } = {}) => {
        chart_area = document.createElement('div');
        chart_area.className = 'ciq-chart-area';
        barrier_area = document.createElement('div');
        barrier_area.className = 'barrier-area';
        chart_line = document.createElement('div');
        chart_line.className = is_draggable ? 'chart-line horizontal draggable' : 'chart-line horizontal';
        drag_handle = document.createElement('div');
        drag_handle.className = 'draggable-area';

        chart_line.appendChild(drag_handle);
        barrier_area.appendChild(chart_line);
        chart_area.appendChild(barrier_area);
        document.body.appendChild(chart_area);
    };

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    it('translates a touch gesture on a draggable barrier into mousedown, mousemove and mouseup', () => {
        setup();
        const onMouseDown = jest.fn();
        const onMouseMove = jest.fn();
        const onMouseUp = jest.fn();
        barrier_area.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        chart_area.addEventListener('mouseup', onMouseUp);

        renderHook(() => useBarrierTouchDrag());

        dispatchTouch(drag_handle, 'touchstart', [createTouch(100)]);
        expect(onMouseDown).toHaveBeenCalledTimes(1);
        expect((onMouseDown.mock.calls[0][0] as MouseEvent).clientY).toBe(100);

        const move_event = dispatchTouch(drag_handle, 'touchmove', [createTouch(140)]);
        expect(onMouseMove).toHaveBeenCalledTimes(1);
        expect((onMouseMove.mock.calls[0][0] as MouseEvent).clientY).toBe(140);
        expect(move_event.defaultPrevented).toBe(true);

        dispatchTouch(drag_handle, 'touchend', [], [createTouch(140)]);
        expect(onMouseUp).toHaveBeenCalledTimes(1);

        window.removeEventListener('mousemove', onMouseMove);
    });

    it('ignores barriers that are not draggable', () => {
        setup({ is_draggable: false });
        const onMouseDown = jest.fn();
        barrier_area.addEventListener('mousedown', onMouseDown);

        renderHook(() => useBarrierTouchDrag());
        dispatchTouch(drag_handle, 'touchstart', [createTouch(100)]);

        expect(onMouseDown).not.toHaveBeenCalled();
    });

    it('does not start a drag for touches outside a barrier', () => {
        setup();
        const onMouseDown = jest.fn();
        chart_area.addEventListener('mousedown', onMouseDown);

        renderHook(() => useBarrierTouchDrag());
        dispatchTouch(chart_area, 'touchstart', [createTouch(100)]);

        expect(onMouseDown).not.toHaveBeenCalled();
    });

    it('ends the drag when a second finger touches the chart', () => {
        setup();
        const onMouseMove = jest.fn();
        const onMouseUp = jest.fn();
        window.addEventListener('mousemove', onMouseMove);
        chart_area.addEventListener('mouseup', onMouseUp);

        renderHook(() => useBarrierTouchDrag());

        dispatchTouch(drag_handle, 'touchstart', [createTouch(100)]);
        dispatchTouch(drag_handle, 'touchmove', [createTouch(120), createTouch(200)]);

        expect(onMouseUp).toHaveBeenCalledTimes(1);
        expect(onMouseMove).not.toHaveBeenCalled();

        window.removeEventListener('mousemove', onMouseMove);
    });

    it('removes its listeners on unmount', () => {
        setup();
        const onMouseDown = jest.fn();
        barrier_area.addEventListener('mousedown', onMouseDown);

        const { unmount } = renderHook(() => useBarrierTouchDrag());
        unmount();
        dispatchTouch(drag_handle, 'touchstart', [createTouch(100)]);

        expect(onMouseDown).not.toHaveBeenCalled();
    });
});
