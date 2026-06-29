import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "36046947"'),
    users: z
        .array(
            z.object({
                userId: z.string().describe('User ID to remove from the group. Example: "c9a996ed-50d2-4df4-ac91-a45032721bb6"')
            })
        )
        .min(1)
});

const UserInfoSchema = z
    .object({
        userId: z.string().optional(),
        userName: z.string().optional(),
        email: z.string().optional(),
        userStatus: z.string().optional(),
        userType: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    resultSetSize: z.string().optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    totalSetSize: z.string().optional(),
    nextUri: z.string().optional(),
    previousUri: z.string().optional(),
    users: z.array(UserInfoSchema).optional()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const action = createAction({
    description: 'Remove users from a group.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/remove-group-users' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = metadataResult.data.accountId;

        const config: ProxyConfiguration = {
            // https://developers.docusign.com/docs/esign-rest-api/reference/usergroups/groups/deletegroupusers/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups/${encodeURIComponent(input.groupId)}/users`,
            data: {
                users: input.users
            },
            retries: 3
        };

        const response = await nango.delete(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from the API.'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
