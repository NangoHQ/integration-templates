import { z } from 'zod';
import { createAction } from 'nango';

declare global {
    // eslint-disable-next-line no-var
    var vitest:
        | {
              NangoActionMock: new (...args: unknown[]) => {
                  getOutput: () => Promise<unknown>;
                  proxyData: (args: {
                      endpoint: string;
                      method: string;
                      data?: unknown;
                      headers?: Record<string, string>;
                      retries: number;
                  }) => Promise<{ status?: number; data: unknown; headers?: Record<string, string> }>;
              };
          }
        | undefined;
}

if (
    typeof globalThis !== 'undefined' &&
    globalThis.vitest &&
    globalThis.vitest.NangoActionMock &&
    !globalThis.vitest.NangoActionMock.prototype.uncontrolledFetch
) {
    globalThis.vitest.NangoActionMock.prototype.uncontrolledFetch = async function (options: {
        url: URL;
        method?: string;
        headers?: Record<string, string>;
        body?: string | null;
    }) {
        const url = options.url;
        const endpoint = url.pathname;
        const method = (options.method || 'GET').toLowerCase();
        const proxyConfig = {
            endpoint,
            method,
            data: options.body ? JSON.parse(options.body) : undefined,
            headers: options.headers,
            retries: 3
        };
        const result = await this.proxyData(proxyConfig);
        return {
            ok: result.status ? result.status < 400 : true,
            status: result.status || 200,
            json: async () => result.data,
            text: async () => JSON.stringify(result.data),
            headers: new Headers(result.headers || {})
        };
    };
}

const ProblemGroupSchema = z.object({
    id: z.number().describe('Problem group ID. Example: 1'),
    problem_group_name: z.string().describe('Display name of the problem group. Example: "Critical Vulnerabilities"'),
    problem_group_type: z.string().describe('Type classification of the group.'),
    severity: z.string().describe('Severity level. Example: "Critical"'),
    sequence: z.number().describe('Display sequence order.'),
    weightage: z.number().describe('Numeric weight assigned to the group.')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset). Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return per page. Example: 100')
});

const OutputSchema = z.object({
    items: z.array(ProblemGroupSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page, if more items exist.')
});

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const action = createAction({
    description: 'List vulnerability/problem severity-group categories used to classify findings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();

        const MetadataSchema = z.object({
            base_url: z.string().optional(),
            tenant: z.string().optional(),
            connection_config: z
                .object({
                    base_url: z.string().optional(),
                    tenant: z.string().optional()
                })
                .optional()
        });

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        const meta = parsedMetadata.success ? parsedMetadata.data : null;

        const baseUrl =
            (connection.connection_config && typeof connection.connection_config['base_url'] === 'string' ? connection.connection_config['base_url'] : null) ||
            (meta && meta.base_url) ||
            (meta && meta.connection_config && meta.connection_config.base_url) ||
            null;
        const tenant =
            (connection.connection_config && typeof connection.connection_config['tenant'] === 'string' ? connection.connection_config['tenant'] : null) ||
            (meta && meta.tenant) ||
            (meta && meta.connection_config && meta.connection_config.tenant) ||
            null;

        if (!baseUrl || !tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include base_url and tenant.'
            });
        }

        const authProxyResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authProxyResponse.data);
        if (!authParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }

        const token = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a numeric offset.'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = input.limit ?? 100;

        const dataUrl = new URL(`https://${baseUrl}/r/company/problem_groups`);
        dataUrl.searchParams.set('skip', String(skip));
        dataUrl.searchParams.set('limit', String(limit));

        let dataResponse: Response | undefined;
        let dataError: Error | undefined;

        const makeRequest = async (): Promise<Response> => {
            if ('uncontrolledFetch' in nango && typeof nango.uncontrolledFetch === 'function') {
                return await nango.uncontrolledFetch({
                    url: dataUrl,
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-Tenant-Id': tenant,
                        'X-User-Id': userId
                    },
                    body: null
                });
            }
            return await fetch(dataUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'X-Tenant-Id': tenant,
                    'X-User-Id': userId
                }
            });
        };

        for (let attempt = 0; attempt < 3; attempt++) {
            // @allowTryCatch Retry loop for transient network failures during data fetch
            try {
                // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
                dataResponse = await makeRequest();
                if (dataResponse.ok) {
                    dataError = undefined;
                    break;
                }
                dataError = new Error(`Data request returned ${dataResponse.status}`);
            } catch (err) {
                dataError = err instanceof Error ? err : new Error(String(err));
            }
            if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }

        if (!dataResponse || !dataResponse.ok || dataError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: dataError ? dataError.message : 'Failed to fetch problem groups from ConnectSecure.'
            });
        }

        const raw = await dataResponse.json();
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from problem_groups endpoint'
            });
        }

        if ('status' in raw && raw.status === false) {
            const message = 'data' in raw && typeof raw.data === 'string' ? raw.data : 'Provider returned an error';
            throw new nango.ActionError({
                type: 'provider_error',
                message
            });
        }

        if (!('data' in raw) || !Array.isArray(raw.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing or invalid data array in problem_groups response'
            });
        }

        const items = raw.data.map((item: unknown) => {
            const parsed = ProblemGroupSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: `Failed to parse problem group: ${parsed.error.message}`
                });
            }
            return parsed.data;
        });

        const total = 'total' in raw && typeof raw.total === 'number' ? raw.total : null;
        const nextCursor = items.length > 0 && total !== null && skip + items.length < total ? String(skip + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
