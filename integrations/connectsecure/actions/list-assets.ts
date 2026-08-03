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

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of assets to return per page.'),
    condition: z.string().optional().describe('SQL-like filter condition. Example: "id=152060779"'),
    order_by: z.string().optional().describe('Sort order for the results.')
});

const AssetSchema = z
    .object({
        id: z.number().describe('Asset ID. Example: 152060779'),
        company_id: z.number().optional().describe('Company ID. Example: 16637'),
        host: z.string().optional().describe('Host name. Example: Victors-MBP')
    })
    .passthrough();

const OutputSchema = z.object({
    assets: z.array(AssetSchema),
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

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List discovered assets (endpoints/devices) across this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric skip offset'
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

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664/V4+API+Information
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
        const authData = authParsed.data;

        const queryParams = new URLSearchParams();
        if (input.limit !== undefined) {
            queryParams.set('limit', String(input.limit));
        }
        if (skip > 0) {
            queryParams.set('skip', String(skip));
        }
        if (input.condition !== undefined) {
            queryParams.set('condition', input.condition);
        }
        if (input.order_by !== undefined) {
            queryParams.set('order_by', input.order_by);
        }

        const url = new URL(`https://${baseUrl}/r/asset/assets`);
        url.search = queryParams.toString();

        const dataResponse = await nango.uncontrolledFetch({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664/V4+API+Information
            url,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': String(authData.user_id)
            }
        });

        if (!dataResponse.ok) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `ConnectSecure API returned ${dataResponse.status}`,
                status: dataResponse.status
            });
        }

        const rawData = await dataResponse.json();
        const providerResponse = ProviderResponseSchema.parse(rawData);

        const assets = providerResponse.data.map((item) => {
            return AssetSchema.parse(item);
        });

        const nextSkip = skip + assets.length;
        const next_cursor = providerResponse.total !== undefined && nextSkip < providerResponse.total ? String(nextSkip) : undefined;

        return {
            assets,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
