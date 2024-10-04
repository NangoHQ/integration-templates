import type { NangoSync } from '../../models';

export async function* paginateHubSpot<T>(nango: NangoSync, endpoint: string, paramsOrData: any, method: 'get' | 'post'): AsyncGenerator<T[]> {
    let hasMore = true;
    let after: string | undefined = undefined;

    while (hasMore) {
        if (after) {
            if (method === 'get') {
                paramsOrData = { ...paramsOrData, after: after };
            } else {
                paramsOrData = { ...paramsOrData, after: after };
            }
        }

        const response =
            method === 'get' ? await nango.get({ endpoint, params: paramsOrData, retries: 3 }) : await nango.post({ endpoint, data: paramsOrData, retries: 3 });

        const data = response.data;

        if (data.results && data.results.length > 0) {
            yield data.results;
        }

        if (data.paging && data.paging.next && data.paging.next.after) {
            after = data.paging.next.after;
        } else {
            hasMore = false;
        }
    }
}
