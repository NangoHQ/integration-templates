import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email address of the user. Example: "user@example.com"'),
    groupUuids: z.array(z.string()).max(200).describe('List of group UUIDs to assign to the user. Max 200.')
});

const OutputSchema = z.object({});

const action = createAction({
    description: "Replace a user's entire group membership list in one call (removes them from any group not included).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountUuid = metadata?.['accountUuid'];

        if (typeof accountUuid !== 'string') {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in connection metadata.'
            });
        }

        await nango.put({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/user-management-api/account-users-api
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/users/${encodeURIComponent(input.email)}/groups`,
            data: input.groupUuids,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
