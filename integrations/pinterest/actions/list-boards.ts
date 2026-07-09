import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    privacy: z.enum(['ALL', 'PUBLIC', 'PROTECTED', 'SECRET']).optional().describe('Privacy level filter. Example: "PUBLIC"')
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    privacy: z.string(),
    owner: z
        .object({
            username: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    pin_count: z.number().optional().nullable(),
    follower_count: z.number().optional().nullable(),
    media: z
        .object({
            image_cover_url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            privacy: z.string(),
            owner_username: z.string().optional(),
            pin_count: z.number().optional(),
            follower_count: z.number().optional(),
            image_cover_url: z.string().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List boards.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/boards/list
        const response = await nango.get({
            endpoint: '/v5/boards',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.privacy !== undefined && { privacy: input.privacy })
            },
            retries: 3
        });

        const rawData = response.data;

        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Pinterest API.'
            });
        }

        if (!Array.isArray(rawData.items)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of boards from the Pinterest API.'
            });
        }

        const itemsArray: unknown[] = rawData.items;

        const parsedItems = itemsArray.map((item) => {
            const parsed = ProviderBoardSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse a board item from the Pinterest API response.'
                });
            }
            const board = parsed.data;
            return {
                id: board.id,
                name: board.name,
                ...(board.description != null && { description: board.description }),
                privacy: board.privacy,
                ...(board.owner?.username != null && { owner_username: board.owner.username }),
                ...(board.pin_count != null && { pin_count: board.pin_count }),
                ...(board.follower_count != null && { follower_count: board.follower_count }),
                ...(board.media?.image_cover_url != null && { image_cover_url: board.media.image_cover_url }),
                ...(board.created_at != null && { created_at: board.created_at }),
                ...(board.updated_at != null && { updated_at: board.updated_at })
            };
        });

        const nextCursor = typeof rawData.bookmark === 'string' ? rawData.bookmark : undefined;

        return {
            items: parsedItems,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
