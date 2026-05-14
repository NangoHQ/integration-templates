import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID whose owned Lists you would like to retrieve. Example: "123456789"'),
    maxResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('The maximum number of results to be returned per page. This can be a number between 1 and 100. Default: 100'),
    paginationToken: z.string().optional().describe('Pagination token from the previous response to get the next page of results')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    follower_count: z.number().optional(),
    member_count: z.number().optional(),
    owner_id: z.string().optional(),
    private: z.boolean().optional()
});

const ProviderMetaSchema = z.object({
    result_count: z.number(),
    next_token: z.string().optional(),
    previous_token: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderListSchema).optional(),
    meta: ProviderMetaSchema.optional()
});

const ListOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().optional(),
    description: z.string().optional(),
    followerCount: z.number().optional(),
    memberCount: z.number().optional(),
    ownerId: z.string().optional(),
    isPrivate: z.boolean().optional()
});

const OutputSchema = z.object({
    lists: z.array(ListOutputSchema),
    nextToken: z.string().optional(),
    previousToken: z.string().optional(),
    resultCount: z.number()
});

const action = createAction({
    description: 'List all Lists owned by a specified user from X API',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-lists',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list.read', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            max_results: input.maxResults ?? 100,
            'list.fields': 'created_at,description,follower_count,member_count,owner_id,private'
        };

        if (input.paginationToken) {
            params['pagination_token'] = input.paginationToken;
        }

        // https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-users-id-owned_lists
        const response = await nango.get({
            endpoint: `/2/users/${input.userId}/owned_lists`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const lists =
            parsed.data?.map((list) => ({
                id: list.id,
                name: list.name,
                ...(list.created_at !== undefined && { createdAt: list.created_at }),
                ...(list.description !== undefined && { description: list.description }),
                ...(list.follower_count !== undefined && { followerCount: list.follower_count }),
                ...(list.member_count !== undefined && { memberCount: list.member_count }),
                ...(list.owner_id !== undefined && { ownerId: list.owner_id }),
                ...(list.private !== undefined && { isPrivate: list.private })
            })) ?? [];

        return {
            lists,
            resultCount: parsed.meta?.result_count ?? 0,
            ...(parsed.meta?.next_token !== undefined && { nextToken: parsed.meta.next_token }),
            ...(parsed.meta?.previous_token !== undefined && { previousToken: parsed.meta.previous_token })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
