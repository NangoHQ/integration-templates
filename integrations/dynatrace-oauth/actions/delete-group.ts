import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('The UUID of the group to delete. Example: "a74aebb2-50ae-427f-a404-1b15c60edb61"')
});

const OutputSchema = z.object({
    groupUuid: z.string(),
    deletedCount: z.number()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Delete a user group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read', 'account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedConfig = ConnectionConfigSchema.safeParse(metadata);

        if (!parsedConfig.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing accountUuid in metadata.'
            });
        }

        const accountUuid = parsedConfig.data.accountUuid;

        const response = await nango.delete({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups-api/delete-group
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}`,
            retries: 1
        });

        const rawBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const deletedCount = parseInt(rawBody, 10);

        if (Number.isNaN(deletedCount)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected numeric response body from delete group endpoint.',
                rawBody: rawBody
            });
        }

        return {
            groupUuid: input.groupUuid,
            deletedCount: deletedCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
