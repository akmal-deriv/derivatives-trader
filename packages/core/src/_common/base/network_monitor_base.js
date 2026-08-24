const { localize } = require('@deriv-com/translations');
const BinarySocket = require('./socket_base');

/*
 * Monitors the network status and initialises the WebSocket connection
 * 1. online : check the WS status (init/send: blink after timeout, open/message: online)
 * 2. offline: it is offline
 */
const NetworkMonitorBase = (() => {
    // Use getter functions to ensure localize() is called when needed, not at module init
    const getStatusConfig = status => {
        const configs = {
            online: { class: 'online', tooltip: localize('Online') },
            offline: { class: 'offline', tooltip: localize('Offline') },
            blinking: { class: 'blinker', tooltip: localize('Connecting to server') },
        };
        return configs[status];
    };

    let setNetworkStatus;

    // Bounded, jittered reconnect backoff so a failed attempt retries calmly instead of dead-ending.
    const RECONNECT_BASE_MS = 1000;
    const RECONNECT_CAP_MS = 10000;
    let reconnect_timeout = null;
    let reconnect_attempt = 0;

    const isOnline = () => navigator.onLine;

    const isPageVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

    // Full-jitter exponential backoff, capped: random delay in [0, min(base * 2^n, cap)).
    const getReconnectDelay = () => {
        const ceiling = Math.min(RECONNECT_BASE_MS * 2 ** reconnect_attempt, RECONNECT_CAP_MS);
        return Math.floor(Math.random() * ceiling);
    };

    const clearReconnect = () => {
        clearTimeout(reconnect_timeout);
        reconnect_timeout = null;
    };

    // Keep retrying to reconnect with bounded backoff until an `open` event resets us. Scheduling is
    // paused while the device is offline or the page is hidden; the online / visibilitychange /
    // pageshow handlers resume it. Replaces the old single-shot behaviour that gave up after one try.
    function reconnectAfter({ timeout } = {}) {
        clearReconnect();

        if (!isOnline() || !isPageVisible()) return;

        const delay = typeof timeout === 'number' ? timeout : getReconnectDelay();
        reconnect_timeout = setTimeout(() => {
            reconnect_timeout = null;

            // Conditions may have changed while waiting; re-check before acting.
            if (!isOnline() || !isPageVisible()) return;

            // Already OPEN — the connection survived (e.g. an `online` event without a real drop).
            // Probe it once and stop looping: no `open` event will ever arrive to clear us, and
            // zombie-OPEN detection is the keep-alive's job.
            if (BinarySocket.hasReadyState(1)) {
                reconnect_attempt = 0;
                BinarySocket.sendKeepAlive();
                return;
            }

            // CLOSING/CLOSED (or never created): open a fresh connection. A CONNECTING handshake is
            // left to finish — the rescheduled check below deals with it if it never opens.
            if (!BinarySocket.hasReadyState(0)) {
                BinarySocket.openNewConnection();
            }

            // Not connected yet — grow the backoff and try again. The `open` event resets and stops this.
            reconnect_attempt += 1;
            reconnectAfter({});
        }, delay);
    }

    // On resume, verify the socket. Probe-first: a socket that still reports OPEN gets an immediate
    // keep-alive — socket_base's proof-of-life check tears it down only if there is no reply, so a
    // healthy socket is not needlessly rebuilt (and the status indicator is left alone). A CONNECTING
    // handshake is left to finish; only a closed (or never-created) socket is rebuilt immediately.
    const verifyConnection = () => {
        if (!isOnline()) return;
        reconnect_attempt = 0;
        if (BinarySocket.hasReadyState(1)) {
            BinarySocket.sendKeepAlive();
        } else if (!BinarySocket.hasReadyState(0)) {
            setNetworkStatus('blinking');
            BinarySocket.closeAndOpenNewConnection();
        }
    };

    const init = (socket_general_functions, fncUpdateUI, client_store) => {
        let last_status, last_is_online;
        setNetworkStatus = status => {
            const is_online = isOnline();
            if (status !== last_status || is_online !== last_is_online) {
                last_status = status;
                last_is_online = is_online;
                fncUpdateUI(getStatusConfig(status), is_online);
            }
        };

        if ('onLine' in navigator) {
            window.addEventListener('online', () => {
                setNetworkStatus('blinking');
                reconnect_attempt = 0; // fresh backoff now that the network is back
                reconnectAfter({ timeout: 500 });
            });
            window.addEventListener('offline', () => {
                clearReconnect();
                BinarySocket.close();
                setNetworkStatus('offline');
            });
        } else {
            // default to always online and fallback to WS checks
            navigator.onLine = true;
        }

        // Resume triggers: verify the socket when the page returns to the foreground, or is restored
        // from the back/forward cache (where `visibilitychange` may not fire). `pageshow` also fires
        // on every normal load — only bfcache restores (event.persisted) need verification, and
        // reacting on cold load would tear down the still-connecting initial socket.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') verifyConnection();
        });
        window.addEventListener('pageshow', event => {
            if (event.persisted) verifyConnection();
        });
        window.addEventListener('focus', verifyConnection);
        document.addEventListener('resume', verifyConnection);

        // Always register config/client so the resume paths above can open a connection later even
        // when the app booted offline; only open the initial connection when actually online.
        const ws_config = { wsEvent, isOnline, ...socket_general_functions };
        BinarySocket.init({ options: ws_config, client: client_store });
        if (isOnline()) {
            BinarySocket.openNewConnection();
        }

        setNetworkStatus(isOnline() ? 'blinking' : 'offline');
    };

    const events = {
        init: () => setNetworkStatus(isOnline() ? 'blinking' : 'offline'),
        open: () => {
            setNetworkStatus(isOnline() ? 'online' : 'offline');
            reconnect_attempt = 0; // live connection → reset backoff
            clearReconnect(); // stop the retry loop
        },
        send: () => {},
        message: () => setNetworkStatus('online'),
        close: () => {
            setNetworkStatus(isOnline() ? 'blinking' : 'offline');
            // First close retries quickly; repeated failures join the jittered exponential
            // backoff instead of resetting it to a flat, herd-synchronized 5s on every close.
            reconnectAfter(reconnect_attempt === 0 ? { timeout: 5000 } : {});
        },
    };

    const wsEvent = event => {
        events[event] && events[event](); // eslint-disable-line
    };

    return {
        init,
        wsEvent,
    };
})();

module.exports = NetworkMonitorBase;
