import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    ad_account_id: z.string().optional().describe('Unique identifier of an ad account.'),
    explicit_following: z.boolean().optional().describe('Whether or not to include implicit user follows. When true, only explicit user follows are returned.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Maximum number of items to return per page.')
});

const BoardMediaSchema = z.object({
    image_cover_url: z.string().nullable().optional(),
    pin_thumbnail_urls: z.array(z.string()).optional()
});

const BoardOwnerSchema = z.object({
    username: z.string().optional()
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.string().optional(),
    board_pins_modified_at: z.string().optional(),
    collaborator_count: z.number().int().optional(),
    follower_count: z.number().int().optional(),
    pin_count: z.number().int().optional(),
    is_ads_only: z.boolean().optional(),
    media: BoardMediaSchema.optional(),
    owner: BoardOwnerSchema.optional(),
    privacy: z.enum(['PUBLIC', 'PROTECTED', 'SECRET']).optional()
});

const ListResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(BoardSchema)
});

const OutputSchema = z.object({
    items: z.array(BoardSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List boards the user follows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/user_account/operation/boards_user_follows/list
            endpoint: '/v5/user_account/following/boards',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id }),
                ...(input.explicit_following !== undefined && { explicit_following: String(input.explicit_following) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);

        return {
            items: parsed.items,
            ...(parsed.bookmark != null && { next_cursor: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
