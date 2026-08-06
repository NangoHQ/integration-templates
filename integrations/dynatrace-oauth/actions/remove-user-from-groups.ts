import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('User email address. Must be URL-encoded if it contains special characters like +. Example: "user@example.com"'),
    groupUuids: z.array(z.string()).describe('Array of group UUIDs to remove the user from. Example: ["0bb8915e-fe63-4e37-a1ba-102e7daa375a"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Remove a user from one or more specific groups without affecting other memberships.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawConfig: unknown = connection.connection_config;
        const parsedConfig = ConnectionConfigSchema.safeParse(rawConfig);

        const metadata = await nango.getMetadata();
        const rawMetadata: unknown = metadata;
        const parsedMetadata = ConnectionConfigSchema.safeParse(rawMetadata);

        const accountUuid = parsedConfig.data?.accountUuid ?? parsedMetadata.data?.accountUuid;

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is missing from connection configuration and metadata.'
            });
        }

        const encodedEmail = encodeURIComponent(input.email);

        const config: ProxyConfiguration = {
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/user-management/remove-user-from-groups
            endpoint: `iam/v1/accounts/${accountUuid}/users/${encodedEmail}/groups`,
            params: {
                'group-uuid': input.groupUuids
            },
            retries: 3
        };

        const response = await nango.delete(config);

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Unexpected status code: ${response.status}`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
