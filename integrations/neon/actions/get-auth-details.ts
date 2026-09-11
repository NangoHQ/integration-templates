import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: getAuthDetails
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        account_id: z.string(),
        auth_method: z.enum(['keycloak', 'session_cookie', 'api_key_user', 'api_key_org', 'oauth']),
        auth_data: z.string().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'Retrieve request authentication details. Returns authentication details for the credentials used in the request,\nincluding the credential type (API key, Bearer token, or OAuth session)\nand the associated identity.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/auth`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
