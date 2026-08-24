const { localize } = require('@deriv-com/translations');

class APIMiddleware {
    /**
     * @param {object} config - ws_config (wsEvent etc.) from the network monitor.
     * @param {Promise|null} connection_death - resolves when the connection this middleware
     *   instance belongs to dies (closes, or is replaced by a new connection). One middleware
     *   instance is constructed per connection in socket_base's openNewConnection, right after
     *   the death promise is armed, so the binding is naturally per-connection.
     */
    constructor(config, connection_death = null) {
        this.config = config;
        this.connection_death = connection_death;
        this.debounced_calls = {};
    }

    requestDataTransformer(request) {
        // No transformation needed - account_id is in WebSocket URL
        return request;
    }

    sendWillBeCalled({ args: [request] }) {
        this.config.wsEvent('send');

        const key = requestToKey(request);

        if (key in this.debounced_calls) {
            return this.debounced_calls[key];
        }

        return undefined;
    }

    sendIsCalled({ response_promise, args: [request, options = {}] }) {
        // deriv-api never settles a request whose connection dies — the raw promise would hang
        // forever, leaving callers (React Query observers, purchase spinners, auth gates) stuck.
        // Race every send against this connection's death and settle with a synthetic
        // error-response instead. Resolve-with-error (never reject) matches the deriv API
        // convention every caller already handles — see promiseRejectToResolve below.
        const promise = this.raceConnectionDeath(promiseRejectToResolve(response_promise), request);

        const key = requestToKey(request);

        if (options.callback) {
            promise.then(options.callback);
        }

        // Store the RACED promise: dedup'd callers (sendWillBeCalled above) must receive a promise
        // that settles on connection death too, not the never-settling raw one.
        this.debounced_calls[key] = promise;

        promise.then(() => {
            delete this.debounced_calls[key];
        });

        return promise;
    }

    raceConnectionDeath(promise, request) {
        if (!this.connection_death) return promise;
        return Promise.race([promise, this.connection_death.then(() => buildConnectionLostResponse(request))]);
    }
}

// Delegate error handling to the callback
function promiseRejectToResolve(promise) {
    return new Promise(r => {
        promise.then(r, r);
    });
}

// Synthetic response for a request whose connection died before answering. Shaped exactly like a
// server error response (echo_req included — some stores read response.echo_req on error paths).
function buildConnectionLostResponse(request) {
    return {
        echo_req: request,
        msg_type: deriveMsgType(request),
        error: {
            code: 'ConnectionLost',
            message: localize('The connection was lost before a response was received.'),
        },
    };
}

// Best-effort: the endpoint key is the first non-meta key, mirroring deriv-api's own heuristic.
// (Known divergence: a real ticks_history response reports msg_type 'history'/'candles'.)
function deriveMsgType(request) {
    return Object.keys(request).find(key => !['passthrough', 'req_id', 'subscribe'].includes(key)) || 'unknown';
}

function requestToKey(request) {
    const request_copy = { ...request };

    delete request_copy.passthrough;
    delete request_copy.req_id;
    delete request_copy.subscribe;

    return JSON.stringify(request_copy);
}

module.exports = APIMiddleware;
