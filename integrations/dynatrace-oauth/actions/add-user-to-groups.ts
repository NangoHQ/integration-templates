import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('User email address. Must be URL-encoded if it contains special characters like +. Example: "user@example.com"'),
    group_uuids: z.array(z.string()).describe('Array of group UUIDs to add the user to. Example: ["0bb8915e-fe63-4e37-a1ba-102e7daa375a"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionConfigSchema = z
    .object({
        accountUuid: z.string()
    })
    .passthrough();

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Add a user to one or more groups, leaving their existing group memberships untouched.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
        const connection = await nango.getConnection();
        const configResult = ConnectionConfigSchema.safeParse(connection.connection_config);

        let accountUuid: string | undefined;
        if (configResult.success) {
            accountUuid = configResult.data.accountUuid;
        } else {
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
            const metadata = await nango.getMetadata();
            const metadataResult = MetadataSchema.safeParse(metadata);
            if (metadataResult.success) {
                accountUuid = metadataResult.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in connection_config or metadata.'
            });
        }

        const encodedEmail = encodeURIComponent(input.email);

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/iam/users/manage-group-memberships-of-a-user
        await nango.post({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/users/${encodedEmail}`,
            data: input.group_uuids,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
