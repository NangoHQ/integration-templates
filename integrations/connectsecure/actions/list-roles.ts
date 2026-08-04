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

const InputSchema = z.object({});

const OutputSchema = z.object({
    roles: z.array(z.string())
});

const ProviderEnvelopeSchema = z.object({
    data: z.array(z.string()),
    status: z.boolean().optional()
});

const ProviderArraySchema = z.array(z.string());

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

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional(),
    message: z.string().optional()
});

function isUnauthorizedError(error: unknown): boolean {
    const parsed = AxiosErrorSchema.safeParse(error);
    if (parsed.success) {
        if (parsed.data.response?.status === 401) {
            return true;
        }
        if (parsed.data.message?.includes('status code 401')) {
            return true;
        }
    }
    return false;
}

const action = createAction({
    description: 'List the fixed vocabulary of assignable user roles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let baseUrl: string | undefined;
        let tenant: string | undefined;

        if (connectionConfig && typeof connectionConfig === 'object' && !Array.isArray(connectionConfig)) {
            const configRecord: Record<string, unknown> = connectionConfig;
            const maybeBase = configRecord['base_url'];
            if (typeof maybeBase === 'string') {
                baseUrl = maybeBase;
            }
            const maybeTenant = configRecord['tenant'];
            if (typeof maybeTenant === 'string') {
                tenant = maybeTenant;
            }
        }

        if (!baseUrl || !tenant) {
            const metadataRaw = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadataRaw);
            if (metadataParsed.success) {
                const metadata = metadataParsed.data;
                if (!baseUrl) {
                    const fromMeta = metadata['base_url'];
                    if (typeof fromMeta === 'string') {
                        baseUrl = fromMeta;
                    }
                }
                if (!tenant) {
                    const fromMeta = metadata['tenant'];
                    if (typeof fromMeta === 'string') {
                        tenant = fromMeta;
                    }
                }
                if (!baseUrl || !tenant) {
                    const metaConfig = metadata['connection_config'];
                    if (metaConfig && typeof metaConfig === 'object' && metaConfig !== null) {
                        const ConfigSchema = z.record(z.string(), z.unknown());
                        const configParsed = ConfigSchema.safeParse(metaConfig);
                        if (configParsed.success) {
                            const fromConfig = configParsed.data['base_url'];
                            if (typeof fromConfig === 'string') {
                                baseUrl = fromConfig;
                            }
                            const fromTenant = configParsed.data['tenant'];
                            if (typeof fromTenant === 'string') {
                                tenant = fromTenant;
                            }
                        }
                    }
                }
            }
        }

        if (!baseUrl || !tenant || typeof baseUrl !== 'string' || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'base_url and tenant are required in connection config'
            });
        }

        let rawData: unknown;

        // @allowTryCatch
        // The hosted sandbox connection is currently BASIC, so the proxy injects Basic auth
        // and the endpoint returns 401. We fall back to a direct fetch using the token from
        // /w/authorize. Once the connection is backed by a TWO_STEP provider this catch block
        // will no longer be hit.
        try {
            const response = await nango.get({
                // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
                endpoint: '/r/user/get_roles',
                retries: 3
            });
            if (response.status && response.status >= 400) {
                if (response.status === 401) {
                    throw { response: { status: 401 } };
                }
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: `ConnectSecure returned ${response.status}`
                });
            }
            rawData = response.data;
        } catch (error) {
            if (!isUnauthorizedError(error)) {
                throw error;
            }

            const tokenResponse = await nango.post({
                // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
                endpoint: '/w/authorize',
                retries: 3
            });

            const authParsed = AuthorizeResponseSchema.safeParse(tokenResponse.data);
            if (!authParsed.success) {
                throw new nango.ActionError({
                    type: 'auth_failed',
                    message: 'Failed to obtain access_token or user_id from /w/authorize'
                });
            }
            const authData = authParsed.data;

            const url = new URL(`https://${baseUrl}/r/user/get_roles`);
            const rolesResponse = await nango.uncontrolledFetch({
                url,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authData.access_token}`,
                    'X-Tenant-Id': String(tenant || ''),
                    'X-User-Id': authData.user_id
                }
            });

            if (!rolesResponse.ok) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: `ConnectSecure returned ${rolesResponse.status}`
                });
            }

            rawData = await rolesResponse.json();
        }

        const envelopeParsed = ProviderEnvelopeSchema.safeParse(rawData);
        if (envelopeParsed.success) {
            return {
                roles: envelopeParsed.data.data
            };
        }

        const arrayParsed = ProviderArraySchema.safeParse(rawData);
        if (arrayParsed.success) {
            return {
                roles: arrayParsed.data
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response shape from get_roles'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
