import { NangoAction, NangoSync, ProxyConfiguration } from "nango";

export interface PaginationParams {
    endpoint: string;
    initialCursor?: string | null;
    data?: Record<string, any>;
}

export interface PaginationResponse<T> {
    results: T[];
    moreDataAvailable: boolean;
    nextCursor?: string;
}

/**
 * Paginates through data from a specified endpoint using a given nextCursor value.
 *
 * This is a custom paginate function. The reasons for using this are:
 * The nango.paginate helper has limitations specific to Ashby. For instance, in case of a 200 success: false error,
 * nango.paginate yields an empty array, which won't help us identify these errors.
 *
 * When implementing incremental syncs, Ashby utilizes a syncToken that we need to store as metadata for subsequent
 * API calls. However, nango.paginate only loops through the results, preventing us from capturing and saving the syncToken(Future refrence as all syncs are of full sync_type).
 *
 * @param nango The NangoSync instance used for making API calls.
 * @param endpoint The API endpoint to paginate through.
 * @param initialCursor The initial cursor to start pagination from (optional).
 * @param data Additional data to include in the API request payload (optional).
 * @returns An async generator that yields batches of results.
 */
async function* paginate<T>(
    nango: NangoSync | NangoAction,
    { endpoint, initialCursor, data }: PaginationParams
): AsyncGenerator<PaginationResponse<T>, void, undefined> {
    let nextCursor: string | null = initialCursor !== undefined ? initialCursor : null;

    while (true) {
        const payload: ProxyConfiguration = {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/include-docs-for-endpoints
            endpoint,
            data: {
                cursor: nextCursor,
                ...data,
                limit: 100
            },
            retries: 10
        };

        const response = await nango.post<{
            results: T[];
            moreDataAvailable: boolean;
            nextCursor?: string;
            syncToken?: string;
            success: boolean;
            errors?: string[];
        }>(payload);

        const { data: responseData } = response;

        if (!responseData.success) {
            let errorMessage = `There was an error when running the script`;
            if (responseData.errors && responseData.errors.length > 0) {
                errorMessage += `: ${responseData.errors.join(', ')}`;
            }
            throw new Error(errorMessage);
        }

        const results = responseData.results;
        const moreDataAvailable = responseData.moreDataAvailable;

        yield { results, moreDataAvailable };

        if (!moreDataAvailable) break;
        nextCursor = responseData.nextCursor || null;
    }
}

export default paginate;
