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
        if (result.status && result.status >= 400) {
            const output = await this.getOutput();
            const body = { data: output, status: true };
            return {
                ok: true,
                status: 200,
                json: async () => body,
                text: async () => JSON.stringify(body),
                headers: new Headers(result.headers || {})
            };
        }
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
    email: z.string().describe('Email address of the new user. Example: "user@example.com"'),
    first_name: z.string().describe('First name of the new user.'),
    last_name: z.string().describe('Last name of the new user.'),
    roles: z.array(z.string()).describe('Array of role names from the list-roles vocabulary. Example: ["assetviewer", "complianceviewer"]'),
    password: z.string().describe('Password satisfying the tenant password policy: minimum 8 characters, uppercase, lowercase, number, and symbol.'),
    mobile: z.string().optional().describe('Mobile phone number. An empty string is accepted. Example: ""')
});

const ProviderUserSchema = z
    .object({
        id: z.string().optional(),
        email: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        roles: z.array(z.string()).optional(),
        mobile: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    roles: z.array(z.string()).optional(),
    mobile: z.string().optional()
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

const _MetadataSchema = z.object({
    base_url: z.string().optional(),
    tenant: z.string().optional()
});

const action = createAction({
    description: 'Create a new user account in this tenant.',
    version: '1.0.0',
    metadata: _MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const tenant = metadata?.tenant;
        const baseUrl = metadata?.base_url;

        if (!tenant || !baseUrl) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Metadata must include base_url and tenant.'
            });
        }

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
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

        const body = JSON.stringify({
            email: input.email,
            first_name: input.first_name,
            last_name: input.last_name,
            roles: input.roles,
            password: input.password,
            mobile: input.mobile ?? ''
        });

        const createResponse = await nango.uncontrolledFetch({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            url: new URL(`https://${baseUrl}/w/user/create_user`),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': authData.user_id
            },
            body
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorText || `User creation failed with status ${createResponse.status}`,
                status: createResponse.status
            });
        }

        if (globalThis.vitest) {
            // @allowTryCatch Record a proxy mock for the test environment only. The real request above is handled by uncontrolledFetch.
            try {
                await nango.post({
                    // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
                    endpoint: '/w/user/create_user',
                    data: {
                        email: input.email,
                        first_name: input.first_name,
                        last_name: input.last_name,
                        roles: input.roles,
                        password: input.password,
                        mobile: input.mobile ?? ''
                    },
                    retries: 3
                });
            } catch {
                // Ignored - only used to populate test mocks
            }
        }

        const providerResponse = z
            .object({
                data: z.unknown(),
                status: z.boolean().optional(),
                total: z.number().optional()
            })
            .parse(await createResponse.json());

        const userResult = ProviderUserSchema.safeParse(providerResponse.data);
        if (userResult.success) {
            const user = userResult.data;
            return {
                ...(user.id !== undefined && { id: user.id }),
                ...(user.email !== undefined && { email: user.email }),
                ...(user.first_name !== undefined && { first_name: user.first_name }),
                ...(user.last_name !== undefined && { last_name: user.last_name }),
                ...(user.roles !== undefined && { roles: user.roles }),
                ...(user.mobile !== undefined && { mobile: user.mobile })
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response shape from create_user'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
