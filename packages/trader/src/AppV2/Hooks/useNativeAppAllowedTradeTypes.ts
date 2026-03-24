import { useMemo } from 'react';

import { useMobileBridge, useRemoteConfig } from '@deriv/api';

/**
 * Shared hook that provides native app allowed trade types from remote config.
 * Used by useContractsFor, useGuideContractTypes, and useAvailableContracts.
 *
 * @returns {string[] | undefined} Array of allowed trade types for native mobile app, or undefined if not in mobile app
 */
const useNativeAppAllowedTradeTypes = (): string[] | undefined => {
    const { isBridgeAvailable } = useMobileBridge();
    const { data: remoteConfigData, isLoading } = useRemoteConfig(true);

    const nativeAppAllowedTradeTypes = useMemo(() => {
        if (!isBridgeAvailable) return undefined;
        // Wait for remote config to load before processing
        if (isLoading) return undefined;
        // Defensive check for edge cases
        if (!remoteConfigData?.native_app_allowed_trade_types) {
            // eslint-disable-next-line no-console
            console.warn('native_app_allowed_trade_types missing from remote config');
            // Return empty array to prevent showing unauthorized trade types on mobile if config is corrupted
            return [];
        }
        return Object.values(remoteConfigData.native_app_allowed_trade_types);
    }, [remoteConfigData, isBridgeAvailable, isLoading]);

    return nativeAppAllowedTradeTypes;
};

export default useNativeAppAllowedTradeTypes;
