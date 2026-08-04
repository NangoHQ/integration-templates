import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tenant: z.string().trim().min(1).optional().describe('Tenant ID. If omitted, reads from connection config.')
});

const OutputSchema = z.object({
    has_lowercase: z.boolean(),
    has_number: z.boolean(),
    has_symbol: z.boolean(),
    has_uppercase: z.boolean(),
    min_length: z.number()
});

const ConnectionConfigSchema = z.object({
    tenant: z.string().trim().min(1)
});

const ProviderPasswordPolicySchema = z.object({
    hasLowercase: z.boolean(),
    hasNumber: z.boolean(),
    hasSymbol: z.boolean(),
    hasUppercase: z.boolean(),
    minLength: z.number()
});

const ProviderResponseSchema = z.object({
    data: ProviderPasswordPolicySchema,
    status: z.boolean()
});

const action = createAction({
    description: "Get the tenant's password complexity policy.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let tenant = input.tenant;

        if (!tenant) {
            const connection = await nango.getConnection();
            const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!configParse.success) {
                throw new nango.ActionError({
                    type: 'missing_connection_config',
                    message: 'Missing tenant in connection config.'
                });
            }
            tenant = configParse.data.tenant;
        }

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/user/password_policy',
            params: {
                tenant_id: tenant
            },
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected status code: ${response.status}`
            });
        }

        const bodyParse = ProviderResponseSchema.safeParse(response.data);
        if (!bodyParse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse password policy response.'
            });
        }

        const policy = bodyParse.data.data;
        return {
            has_lowercase: policy.hasLowercase,
            has_number: policy.hasNumber,
            has_symbol: policy.hasSymbol,
            has_uppercase: policy.hasUppercase,
            min_length: policy.minLength
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
