import type { NangoSync, ProxyConfiguration } from '../../models';

const RETRY_INTERVAL_MS = 10000;

export interface BuildBaseQueryParams {
    model: string;
    fields: string[];
    joins?: string[];
    filters?: string[];
    orderBy?: string;
}

export function buildBaseQuery({ model, fields, joins, filters, orderBy }: BuildBaseQueryParams): string {
    if (!fields || fields.length === 0) {
        throw new Error('At least one field must be specified in the query.');
    }

    const fieldSelection = fields.join(', ');
    let query = `SELECT ${fieldSelection} FROM ${model}`;

    if (joins && joins.length > 0) {
        query += ` ${joins.join(' ')}`;
    }

    if (filters && filters.length > 0) {
        query += ` WHERE ${filters.join(' AND ')}`;
    }

    if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
    }
    return query;
}

/**
 * NetSuite has unpredictable behavior and sometimes randomly throws a 401 Invalid Login error,
 * even if the requests aren't rate-limited. This function helps handle this by automatically
 * retrying the request up to the specified number of retries, with a delay between each retry.
 * @param fn - The asynchronous function that returns an AsyncGenerator of data to be fetched.
 * @param maxRetries - The maximum number of retries to attempt if a 401 error occurs.
 * @param nango - The NangoSync instance used for logging and other Nango-related operations.
 * @param retryIntervalMs - The interval in milliseconds to wait between retries (default is `RETRY_INTERVAL_MS`).
 * @returns An AsyncGenerator that yields the result of the `fn` function, retrying on 401 errors.
 */
export async function* retryOn401<T>(
    fn: () => AsyncGenerator<T, void, unknown>,
    maxRetries: number,
    nango: NangoSync,
    retryIntervalMs: number = RETRY_INTERVAL_MS
): AsyncGenerator<T, void, unknown> {
    let retries = 0;

    while (retries <= maxRetries) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
        try {
            for await (const result of fn()) {
                yield result;
            }
            break;
        } catch (error: any) {
            if (error.response?.status === 401 && retries < maxRetries) {
                retries++;
                await nango.log(`Received 401 error. Retrying (${retries}/${maxRetries}) after ${retryIntervalMs}ms...`, { level: 'warn' });
                await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
            } else {
                throw error;
            }
        }
    }
}

export function createProxyConfig(accountId: string, query: string): ProxyConfiguration {
    return {
        method: 'POST',
        // https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158394344595.html
        baseUrlOverride: `https://${accountId}.suitetalk.api.netsuite.com/services/rest/query/v1`,
        headers: { Prefer: 'transient' },
        endpoint: '/suiteql',
        data: { q: query },
        retries: 10,
        retryOn: [401],
        paginate: {
            type: 'offset',
            offset_name_in_request: 'offset',
            response_path: 'items',
            limit_name_in_request: 'limit',
            limit: 1000,
            in_body: false
        }
    };
}
