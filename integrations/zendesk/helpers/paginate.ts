import type { NangoSync, ProxyConfiguration } from '../../models.js';

export interface PaginationParams {
    endpoint: string;
    startTime: number;
    pageSize?: number;
    pathName: string;
}

export interface GenericPaginationResponse<T> {
    results: T[];
}
/**
 * A pagination helper function for APIs using `start_time` for incremental sync and `end_of_stream` to indicate the end of pagination.
 *
 * @param nango The NangoSync instance for API calls.
 * @param options Configuration for pagination, including endpoint, startTime, page size, and pathName.
 * @returns An async generator yielding batches of paginated results.
 */
export async function* paginate<T>(
    nango: NangoSync,
    { endpoint, startTime, pageSize, pathName }: PaginationParams
): AsyncGenerator<GenericPaginationResponse<T>, void, undefined> {
    const nextStartTime = startTime;
    let nextPageLink: string | null = endpoint;

    while (true) {
        const queryParams = {
            per_page: pageSize || 100,
            start_time: nextStartTime
        };

        const config: ProxyConfiguration = {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/include-docs-for-endpoints
            endpoint: nextPageLink!,
            params: nextPageLink === endpoint ? queryParams : {},
            retries: 10
        };

        const response = await nango.get<{
            [key: string]: any;
            next_page: string;
            end_of_stream: boolean;
            end_time: number;
        }>(config);

        const { data: responseData } = response;

        const results = responseData[pathName] || [];
        const nextPage = responseData.next_page || null;

        yield {
            results
        };

        if (responseData.end_of_stream) break;

        nextPageLink = nextPage;

        if (nextPageLink) {
            const urlParts = new URL(nextPageLink);
            nextPageLink = `${urlParts.pathname}${urlParts.search}`;
        }
    }
}
