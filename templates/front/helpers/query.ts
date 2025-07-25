import type { QueryParams } from '../types.js';

export function buildQueryParams(queryParams?: QueryParams): string {
    if (!queryParams) {
        return '';
    }

    const searchParams = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
            searchParams.append(key, String(value));
        }
    });

    return searchParams.toString();
}
