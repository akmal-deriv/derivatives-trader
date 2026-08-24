jest.mock('@deriv-com/translations', () => ({
    localize: text => text,
}));

const APIMiddleware = require('../api_middleware');

describe('APIMiddleware connection-death settlement', () => {
    const makeDeferredDeath = () => {
        let die;
        const death = new Promise(resolve => {
            die = resolve;
        });
        return { death, die };
    };

    const never_settling = new Promise(() => {
        // mirrors deriv-api: a request whose connection dies never settles
    });

    it('settles a pending send with a synthetic error-response on connection death', async () => {
        const { death, die } = makeDeferredDeath();
        const middleware = new APIMiddleware({ wsEvent: jest.fn() }, death);

        const settled = middleware.sendIsCalled({
            response_promise: never_settling,
            args: [{ buy: 'abc123', price: 10, passthrough: { x: 1 }, req_id: 7 }],
        });

        die();

        await expect(settled).resolves.toEqual({
            echo_req: { buy: 'abc123', price: 10, passthrough: { x: 1 }, req_id: 7 },
            msg_type: 'buy',
            error: {
                code: 'ConnectionLost',
                message: 'The connection was lost before a response was received.',
            },
        });
    });

    it('stores the RACED promise for dedup so duplicate callers are not handed the never-settling raw one', async () => {
        const { death, die } = makeDeferredDeath();
        const middleware = new APIMiddleware({ wsEvent: jest.fn() }, death);

        middleware.sendIsCalled({ response_promise: never_settling, args: [{ time: 1 }] });
        const deduped = middleware.sendWillBeCalled({ args: [{ time: 1 }] });
        expect(deduped).toBeDefined();

        die();

        await expect(deduped).resolves.toMatchObject({ error: { code: 'ConnectionLost' } });
    });

    it('fires options.callback on death settlement', async () => {
        const { death, die } = makeDeferredDeath();
        const middleware = new APIMiddleware({ wsEvent: jest.fn() }, death);
        const callback = jest.fn();

        const settled = middleware.sendIsCalled({
            response_promise: never_settling,
            args: [{ time: 1 }, { callback }],
        });

        die();
        await settled;

        expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({ error: { code: expect.any(String), message: expect.any(String) } })
        );
    });

    it('passes real responses through untouched and clears the dedup entry on settle', async () => {
        const { death } = makeDeferredDeath();
        const middleware = new APIMiddleware({ wsEvent: jest.fn() }, death);
        const response = { msg_type: 'time', time: 123, echo_req: { time: 1 } };

        const settled = middleware.sendIsCalled({
            response_promise: Promise.resolve(response),
            args: [{ time: 1 }],
        });

        await expect(settled).resolves.toBe(response);
        // Entry cleared: a new identical request is no longer deduped onto the old promise.
        expect(middleware.sendWillBeCalled({ args: [{ time: 1 }] })).toBeUndefined();
    });

    it('converts rejections to resolutions (existing convention preserved)', async () => {
        const middleware = new APIMiddleware({ wsEvent: jest.fn() }, null);
        const failure = { error: { code: 'WrongResponse' } };

        const settled = middleware.sendIsCalled({
            response_promise: Promise.reject(failure),
            args: [{ time: 1 }],
        });

        await expect(settled).resolves.toBe(failure);
    });

    it('works without a death promise (no race armed)', async () => {
        const middleware = new APIMiddleware({ wsEvent: jest.fn() });
        const response = { msg_type: 'time', time: 5 };

        const settled = middleware.sendIsCalled({ response_promise: Promise.resolve(response), args: [{ time: 1 }] });

        await expect(settled).resolves.toBe(response);
    });
});
