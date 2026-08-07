import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('The UUID of the group to update. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"'),
    name: z.string().describe('The new name for the group.'),
    description: z.string().describe('The new description for the group.'),
    accountUuid: z.string().optional().describe('The account UUID. If omitted, read from connection_config.')
});

const OutputSchema = z.object({
    groupUuid: z.string(),
    name: z.string(),
    description: z.string()
});

const action = createAction({
    description: "Update a group's name/description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();
            accountUuid = connection.connection_config?.['accountUuid'];
        }

        if (!accountUuid || typeof accountUuid !== 'string') {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in input or connection_config.'
            });
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups/put-group
        await nango.put({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}`,
            data: {
                name: input.name,
                description: input.description
            },
            retries: 3
        });

        return {
            groupUuid: input.groupUuid,
            name: input.name,
            description: input.description
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
