import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Maximum number of items to include in a single page. Default 25, max 250.'),
    ad_account_id: z.string().optional().describe('Unique identifier of an ad account.'),
    explicit_following: z.boolean().optional().describe('Whether or not to include implicit user follows.'),
    feed_type: z.enum(['ALL', 'RANKED', 'CREATOR_ONLY', 'RANKED_CREATOR_ONLY']).optional().describe('Type of followees to be kept when filtering them.')
});

const ProviderFollowUserSchema = z.object({
    type: z.string().optional(),
    username: z.string().optional()
});

const ProviderResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(ProviderFollowUserSchema)
});

const FollowUserSchema = z.object({
    type: z.string().optional(),
    username: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(FollowUserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List accounts the user follows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/user_account/GET/user_account/following
            endpoint: '/v5/user_account/following',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id }),
                ...(input.explicit_following !== undefined && { explicit_following: String(input.explicit_following) }),
                ...(input.feed_type !== undefined && { feed_type: input.feed_type })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                type: item.type,
                username: item.username
            })),
            ...(providerResponse.bookmark != null && { next_cursor: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
