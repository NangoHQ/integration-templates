import type { NangoAction, ProxyConfiguration } from '../../models';
import type { FilterFields, ExposedFields, AxiosError, GongError } from '../types';

export interface GongPaginationParams {
    endpoint: string;
    filter: FilterFields;
    contentSelector?: ExposedFields;
    pagination: {
        response_path: string;
    };
}

export interface GongPaginationResponse<T> {
    callTranscripts: T[];
    records: {
        totalRecords: number;
        currentPageSize: number;
        currentPageNumber: number;
        cursor: string;
    };
}

export interface PaginatedGongResponse<T> {
    callTranscripts: T[];
    moreDataAvailable: boolean;
    nextCursor: string | undefined;
}

export async function* paginate<T>(
    nango: NangoAction,
    { endpoint, filter, pagination }: GongPaginationParams
): AsyncGenerator<PaginatedGongResponse<T>, void, undefined> {
    let nextCursor: string | undefined = undefined;

    while (true) {
        const payload: ProxyConfiguration = {
            endpoint,
            data: {
                filter,
                cursor: nextCursor
            },
            retries: 10
        };

        try {
            const response = await nango.post<GongPaginationResponse<T>>(payload);

            const responseData = response.data[pagination.response_path as keyof GongPaginationResponse<T>];

            if (!Array.isArray(responseData)) {
                throw new Error(`Invalid response path: ${pagination.response_path}`);
            }

            const moreDataAvailable = !!response.data.records.cursor;
            nextCursor = response.data.records.cursor || undefined;

            yield {
                callTranscripts: responseData,
                moreDataAvailable,
                nextCursor
            };

            if (!moreDataAvailable) break;
        } catch (error: any) {
            const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
            const emptyResult = errors.includes('No calls found corresponding to the provided filters');
            if (emptyResult) {
                yield {
                    callTranscripts: [],
                    moreDataAvailable: false,
                    nextCursor: undefined
                };
                break;
            } else {
                throw error;
            }
        }
    }
}
