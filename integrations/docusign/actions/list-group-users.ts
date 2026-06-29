import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "36046947"'),
    start_position: z.string().optional().describe('Pagination offset. Example: "0"'),
    count: z.string().optional().describe('Number of records to return. Example: "100"')
});

const ProviderUserSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema).optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    resultSetSize: z.string().optional(),
    totalSetSize: z.string().optional()
});

const UserSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(UserSchema),
    next_start_position: z.string().optional()
});

const action = createAction({
    description: 'List users that belong to a specific group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature', 'group_read'],
    endpoint: {
        path: '/actions/list-group-users',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }
        const accountId = parsedMetadata.data.accountId;
        const groupId = input.groupId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/groups/getgroupusers/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups/${encodeURIComponent(groupId)}/users`,
            params: {
                ...(input.start_position !== undefined && { start_position: input.start_position }),
                ...(input.count !== undefined && { count: input.count })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const users = providerResponse.users ?? [];

        const nextStartPosition =
            providerResponse.endPosition != null &&
            providerResponse.totalSetSize != null &&
            Number(providerResponse.endPosition) + 1 < Number(providerResponse.totalSetSize)
                ? String(Number(providerResponse.endPosition) + 1)
                : undefined;

        return {
            users: users.map((user) => ({
                ...(user.userId !== undefined && { userId: user.userId }),
                ...(user.userName !== undefined && { userName: user.userName }),
                ...(user.email !== undefined && { email: user.email }),
                ...(user.firstName !== undefined && { firstName: user.firstName }),
                ...(user.lastName !== undefined && { lastName: user.lastName }),
                ...(user.userStatus !== undefined && { userStatus: user.userStatus }),
                ...(user.userType !== undefined && { userType: user.userType })
            })),
            ...(nextStartPosition !== undefined && { next_start_position: nextStartPosition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
