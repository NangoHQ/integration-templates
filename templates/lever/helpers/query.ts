import type { QueryParams } from '../types.js';

export function buildUrlWithParams(baseUrl: string, queryParams?: QueryParams): string {
    if (!queryParams) {
        return baseUrl;
    }

    const searchParams = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
