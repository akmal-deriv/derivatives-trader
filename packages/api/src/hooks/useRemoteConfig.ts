import { useEffect, useRef, useState } from 'react';

import { ObjectUtils } from '@deriv-com/utils';

import initData from '../remote_config.json';

const remoteConfigQuery = async function () {
    const REMOTE_CONFIG_URL = (typeof process !== 'undefined' && process.env?.REMOTE_CONFIG_URL) || '';
    if (REMOTE_CONFIG_URL === '') {
        return null;
    }
    const response = await fetch(REMOTE_CONFIG_URL);
    if (!response.ok) {
        throw new Error('Remote Config Server is out of reach!');
    }
    return response.json();
};

function useRemoteConfig(enabled = false) {
    // Start with empty object if enabled to ensure we wait for remote fetch
    // This prevents destructuring errors while maintaining loading state
    const [data, setData] = useState<typeof initData>(enabled ? ({} as typeof initData) : initData);
    const [isLoading, setIsLoading] = useState(enabled);
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (enabled) {
            setIsLoading(true);
            remoteConfigQuery()
                .then(async res => {
                    if (isMounted.current) {
                        // Use remote config if available, otherwise fallback to initData
                        if (res) {
                            // Only update if data is different or this is first fetch (data is empty object)
                            const isFirstFetch = Object.keys(data || {}).length === 0;
                            if (isFirstFetch) {
                                setData(res);
                            } else {
                                const resHash = await ObjectUtils.hashObject(res);
                                const dataHash = await ObjectUtils.hashObject(data);
                                if (resHash !== dataHash) {
                                    setData(res);
                                }
                            }
                        } else {
                            // No response from remote, fallback to initData
                            setData(initData);
                        }
                        setIsLoading(false);
                    }
                })
                .catch(error => {
                    // eslint-disable-next-line no-console
                    console.log('Remote Config error: ', error);
                    // Fallback to initData if remote fetch fails
                    if (isMounted.current) {
                        setData(initData);
                        setIsLoading(false);
                    }
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return { data, isLoading };
}

export default useRemoteConfig;
