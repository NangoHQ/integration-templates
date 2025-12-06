import type { NangoSync, ProxyConfiguration } from 'nango';
import type { NamelyAPIProfileResponse, NamelyProfile, LinkedGroup } from '../types.js';

export interface PaginationParams {
    endpoint: string;
    limit?: number;
    responseDataPath: string;
    additionalFilters?: Record<string, string | number | string[] | number[]>;
    lastSyncDate?: Date | undefined;
}

interface NamelyPaginatedResult {
    profiles: NamelyProfile[];
    groups: LinkedGroup[];
}

export async function* paginate(
    nango: NangoSync,
    { endpoint, limit = 100, responseDataPath, additionalFilters = {}, lastSyncDate }: PaginationParams
): AsyncGenerator<NamelyPaginatedResult, void, undefined> {
    let currentPage = 1;

    while (true) {
        const params: Record<string, string | number | string[] | number[]> = {
            per_page: limit,
            page: currentPage,
            ...additionalFilters
        };

        await nango.log('Syncing records with pagination:', {
            page: currentPage,
            limit
        });

        const proxyConfig: ProxyConfiguration = {
            // https://developers.namely.com/docs/namely-api/namely-api-reference
            endpoint,
            params,
            retries: 10
        };

        const response = await nango.get<NamelyAPIProfileResponse>(proxyConfig);

        if (!response?.data || (responseDataPath === 'profiles' && !response.data.profiles)) {
            await nango.log('No data found in response, exiting pagination.');
            break;
        }

        const profiles = response.data.profiles || [];
        const groups = response.data.linked.groups || [];

        if (profiles.length === 0) {
            await nango.log('No more profiles found, exiting pagination.');
            break;
        }

        let filteredProfiles = profiles;
        if (lastSyncDate) {
            filteredProfiles = profiles.filter((profile) => {
                const updatedAt = new Date(profile.updated_at * 1000);
                return updatedAt >= lastSyncDate;
            });

            if (filteredProfiles.length === 0) {
                await nango.log('Reached profiles older than lastSyncDate, stopping pagination.');
                break;
            }
        }

        yield {
            profiles: filteredProfiles,
            groups
        };

        if (profiles.length < limit) {
            await nango.log('Received fewer results than limit, pagination complete.');
            break;
        }

        currentPage++;
    }
}
