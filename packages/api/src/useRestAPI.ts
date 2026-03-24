import React from 'react';

import { APIContext } from './APIProvider';

/**
 * Hook to access REST API configuration from APIProvider
 * Provides centralized REST API base URL and fetch helper
 */
export const useRestAPI = () => {
    const context = React.useContext(APIContext);

    if (!context) {
        throw new Error('useRestAPI must be used within APIProvider');
    }

    const { restAPIConfig } = context;

    /**
     * Generic fetch wrapper with default config
     * @param endpoint - API endpoint path (e.g., '/v1/derivatives/account')
     * @param options - Optional fetch options
     * @returns Promise with typed response
     */
    const fetchREST = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
        const url = `${restAPIConfig.baseUrl}${endpoint}`;

        // Determine the method (default to GET if not specified)
        const method = options?.method || 'GET';

        // Only set Content-Type for methods that typically have a body
        const shouldSetContentType = ['POST', 'PUT', 'PATCH'].includes(method);

        const response = await fetch(url, {
            ...options,
            method,
            credentials: 'include', // Send cookies by default for authentication
            headers: {
                ...(shouldSetContentType && { 'Content-Type': 'application/json' }),
                ...options?.headers,
            },
        });

        if (!response.ok) {
            // Try to parse error body for more detailed error information
            let errorBody;
            try {
                errorBody = await response.json();
            } catch {
                // If response body is not JSON, use generic error
                errorBody = null;
            }

            // Extract error message from API response if available
            const errorMessage =
                errorBody?.errors?.[0]?.message || `REST API Error: ${response.status} ${response.statusText}`;
            const errorCode = errorBody?.errors?.[0]?.code;

            // Create enhanced error with additional properties
            const error = new Error(errorMessage) as Error & {
                status: number;
                statusText: string;
                code?: string;
                body?: unknown;
                isAuthError: boolean;
            };

            error.status = response.status;
            error.statusText = response.statusText;
            error.code = errorCode;
            error.body = errorBody;
            error.isAuthError = response.status === 401 || response.status === 403;

            throw error;
        }

        const data = await response.json();

        return data;
    };

    return {
        baseUrl: restAPIConfig.baseUrl,
        fetchREST,
    };
};
