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

const InputSchema = z.object({});

const ConnectionConfigSchema = z.object({
    base_url: z.string(),
    tenant: z.string()
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

const IntegrationActionParamSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    default_value: z.unknown().optional()
});

const IntegrationActionSchema = z.object({
    name: z.string(),
    method: z.string(),
    destination: z.string(),
    parameters: z.array(IntegrationActionParamSchema).nullish(),
    convert_resp: z.string().nullish()
});

const IntegrationSchema = z.object({
    id: z.string().or(z.number()).optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    actions: z.array(IntegrationActionSchema).nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(IntegrationSchema).or(IntegrationSchema),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const OutputIntegrationActionSchema = z.object({
    name: z.string(),
    method: z.string(),
    destination: z.string(),
    parameters: z
        .array(
            z.object({
                name: z.string(),
                type: z.string().optional(),
                required: z.boolean().optional(),
                default_value: z.unknown().optional()
            })
        )
        .optional(),
    convert_resp: z.string().optional()
});

const OutputIntegrationSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    actions: z.array(OutputIntegrationActionSchema).optional()
});

const OutputSchema = z.object({
    integrations: z.array(OutputIntegrationSchema)
});

const action = createAction({
    description: 'List third-party integrations configured or available for this account, including their action/parameter definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let connectionConfigSource: unknown = connection.connection_config;
        if (!ConnectionConfigSchema.safeParse(connectionConfigSource).success) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success) {
                connectionConfigSource = metadataParsed.data['connection_config'] ?? metadataParsed.data;
            }
        }

        const connectionConfig = ConnectionConfigSchema.parse(connectionConfigSource);

        const baseUrl = `https://${connectionConfig.base_url}`;
        const tenant = connectionConfig.tenant;

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authorizeResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authorizeResponse.data);
        if (!authParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }
        const accessToken = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const response = await nango.uncontrolledFetch({
            url: new URL(`${baseUrl}/r/integration/get_integrations`),
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            body: null
        });

        if (!response.ok) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `API request failed with status ${response.status}`
            });
        }

        const responseBody = await response.json();
        const parsed = ProviderResponseSchema.parse(responseBody);
        const rawData = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

        const integrations = rawData.map((integration) => {
            const actions =
                integration.actions?.map((actionItem) => ({
                    name: actionItem.name,
                    method: actionItem.method,
                    destination: actionItem.destination,
                    ...(actionItem.parameters != null && {
                        parameters: actionItem.parameters.map((param) => ({
                            name: param.name,
                            ...(param.type !== undefined && { type: param.type }),
                            ...(param.required !== undefined && { required: param.required }),
                            ...(param.default_value !== undefined && { default_value: param.default_value })
                        }))
                    }),
                    ...(actionItem.convert_resp != null && { convert_resp: actionItem.convert_resp })
                })) ?? [];

            return {
                ...(integration.id !== undefined && {
                    id: typeof integration.id === 'number' ? String(integration.id) : integration.id
                }),
                ...(integration.name !== undefined && { name: integration.name }),
                ...(integration.type !== undefined && { type: integration.type }),
                ...(actions.length > 0 && { actions })
            };
        });

        return {
            integrations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
