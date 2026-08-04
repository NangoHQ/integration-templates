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

const InputSchema = z.object({
    condition: z.string().optional().describe('SQL-like condition filter. Example: "id=152060779"'),
    limit: z.number().int().min(1).max(5000).optional().describe('Maximum number of results to return. Example: 100'),
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.')
});

const ProviderSettingSchema = z
    .object({
        id: z.string().or(z.number()),
        category: z.string().optional(),
        sub_category: z.string().optional(),
        name: z.string().optional(),
        value: z.unknown().optional(),
        company_id: z.string().or(z.number()).nullable().optional()
    })
    .passthrough();

const OutputItemSchema = z.object({
    id: z.string(),
    category: z.string().optional(),
    sub_category: z.string().optional(),
    name: z.string().optional(),
    value: z.unknown().optional(),
    company_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
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
    description: 'List global/company-level configuration settings for this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor != null && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative numeric skip offset.'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (!Number.isSafeInteger(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative numeric skip offset.'
            });
        }

        const connection = await nango.getConnection();
        let baseUrl = connection.connection_config?.['base_url'];
        let tenant = connection.connection_config?.['tenant'];

        if (!baseUrl || !tenant) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success) {
                baseUrl ??= metadataParsed.data['base_url'];
                tenant ??= metadataParsed.data['tenant'];
                const metaConfig = metadataParsed.data['connection_config'];
                if (metaConfig && typeof metaConfig === 'object') {
                    const ConfigSchema = z.record(z.string(), z.unknown());
                    const configParsed = ConfigSchema.safeParse(metaConfig);
                    if (configParsed.success) {
                        baseUrl ??= configParsed.data['base_url'];
                        tenant ??= configParsed.data['tenant'];
                    }
                }
            }
        }

        if (!baseUrl || !tenant || typeof baseUrl !== 'string' || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include base_url and tenant.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }
        const accessToken = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        const url = new URL(`https://${baseUrl}/r/company/settings`);
        if (input.condition) {
            url.searchParams.append('condition', input.condition);
        }
        if (input.limit != null) {
            url.searchParams.append('limit', String(input.limit));
        }
        url.searchParams.append('skip', String(skip));

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        let fetchResponse: Response | undefined;
        let requestError: Error | undefined;

        for (let attempt = 0; attempt < 3; attempt++) {
            // @allowTryCatch Retry loop for transient network failures during data fetch
            try {
                fetchResponse = await nango.uncontrolledFetch({
                    url,
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'X-Tenant-Id': tenant,
                        'X-User-Id': userId
                    }
                });
                if (fetchResponse.ok) {
                    requestError = undefined;
                    break;
                }
                requestError = new Error(`ConnectSecure API returned ${fetchResponse.status}`);
                if (fetchResponse.status !== 429 && fetchResponse.status < 500) {
                    break;
                }
            } catch (err) {
                requestError = err instanceof Error ? err : new Error(String(err));
            }
            if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }

        if (!fetchResponse || !fetchResponse.ok || requestError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: requestError ? requestError.message : `ConnectSecure API returned ${fetchResponse?.status}`,
                status: fetchResponse?.status
            });
        }

        const responseBody = await fetchResponse.json();

        const ProviderResponseSchema = z
            .object({
                data: z.array(z.unknown()).optional(),
                total: z.number().optional()
            })
            .passthrough();

        const parsedResponse = ProviderResponseSchema.parse(responseBody);
        const dataArray = parsedResponse.data ?? [];
        const total = parsedResponse.total ?? 0;

        const items = dataArray.map((item) => {
            const parsed = ProviderSettingSchema.parse(item);
            return {
                id: String(parsed.id),
                ...(parsed.category != null && { category: parsed.category }),
                ...(parsed.sub_category != null && { sub_category: parsed.sub_category }),
                ...(parsed.name != null && { name: parsed.name }),
                ...(parsed.value !== undefined && { value: parsed.value }),
                ...(parsed.company_id != null && { company_id: String(parsed.company_id) })
            };
        });

        const nextSkip = skip + items.length;
        const next_cursor = nextSkip < total ? String(nextSkip) : undefined;

        return {
            items,
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
