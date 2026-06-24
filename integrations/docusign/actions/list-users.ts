import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string()
});

const InputSchema = z.object({
    email: z.string().optional().describe('Filter by email address. Example: "api@nango.dev"'),
    status: z.string().optional().describe('Filter by user status. Example: "active"'),
    start_position: z.string().optional().describe('Pagination offset. Example: "0"'),
    count: z.string().optional().describe('Number of results to return. Example: "10"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    userId: z.string(),
    userName: z.string().optional(),
    email: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional(),
    createdDateTime: z.string().optional(),
    activationDateTime: z.string().optional(),
    lastLoginDateTime: z.string().optional()
});

const ProviderResponseSchema = z.object({
    resultSetSize: z.string().optional(),
    totalSetSize: z.string().optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    users: z.array(ProviderUserSchema).optional()
});

const UserSchema = z.object({
    userId: z.string(),
    userName: z.string().optional(),
    email: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional(),
    createdDateTime: z.string().optional(),
    activationDateTime: z.string().optional(),
    lastLoginDateTime: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(UserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List account users with optional filters.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-users'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataParsed = MetadataSchema.safeParse(metadata);
        if (!metadataParsed.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = metadataParsed.data.accountId;
        const startPosition = input.cursor || input.start_position || '0';
        const count = input.count || '100';

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountusers/list/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/users`,
            params: {
                start_position: startPosition,
                count: count,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const users = providerResponse.users || [];

        const items = users.map((user) => ({
            userId: user.userId,
            ...(user.userName !== undefined && { userName: user.userName }),
            ...(user.email !== undefined && { email: user.email }),
            ...(user.userStatus !== undefined && { userStatus: user.userStatus }),
            ...(user.userType !== undefined && { userType: user.userType }),
            ...(user.createdDateTime !== undefined && { createdDateTime: user.createdDateTime }),
            ...(user.activationDateTime !== undefined && { activationDateTime: user.activationDateTime }),
            ...(user.lastLoginDateTime !== undefined && { lastLoginDateTime: user.lastLoginDateTime })
        }));

        const resultSetSize = parseInt(providerResponse.resultSetSize || '0', 10);
        const startPos = parseInt(providerResponse.startPosition || '0', 10);
        const totalSetSize = parseInt(providerResponse.totalSetSize || '0', 10);
        const nextStartPosition = startPos + resultSetSize;
        const nextCursor = nextStartPosition < totalSetSize ? String(nextStartPosition) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
