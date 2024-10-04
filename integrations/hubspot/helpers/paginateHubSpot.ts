import type { NangoSync } from '../../models';

export async function* paginateHubSpot<T>(
    nango: NangoSync,
    endpoint: string,
    params: Record<string, any>
): AsyncGenerator<T[], void, undefined> {
    let hasMore = true;
    let after: string | undefined = undefined;

    while (hasMore) {
        const requestParams = { ...params };
        if (after) {
            requestParams['after'] = after;
        }

        const response = await nango.get<{ results: T[]; paging?: { next?: { after: string } } }>({
            endpoint,
            params: requestParams,
        });

        const data = response.data;

        if (data.results && data.results.length > 0) {
            yield data.results;
        } else {
            break;
        }

        if (data.paging && data.paging.next && data.paging.next.after) {
            after = data.paging.next.after;
        } else {
            hasMore = false;
        }
    }
}