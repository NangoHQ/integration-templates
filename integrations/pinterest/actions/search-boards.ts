import { z } from 'zod';
import { createAction } from 'nango';

const BoardMediaSchema = z.object({
    image_cover_url: z.string().nullable().optional(),
    pin_thumbnail_urls: z.array(z.string()).optional()
});

const BoardOwnerSchema = z.object({
    username: z.string().optional()
});

const BoardSchema = z.object({
    id: z.string().describe('Board ID. Example: "549755885175"'),
    name: z.string().describe('Board name. Example: "Summer recipes"'),
    description: z.string().optional().describe('Board description. Example: "My favorite summer recipes"'),
    privacy: z.enum(['PUBLIC', 'PROTECTED', 'SECRET']).optional().describe('Privacy setting for the board.'),
    is_ads_only: z.boolean().optional().describe('Whether the board is ad-only.'),
    created_at: z.string().optional().describe('Date and time of board creation.'),
    board_pins_modified_at: z.string().optional().describe('Date and time of last board pins modified.'),
    collaborator_count: z.number().optional().describe('Count of collaborators on the board.'),
    follower_count: z.number().optional().describe('Board follower count.'),
    pin_count: z.number().optional().describe('Count of Pins on the board.'),
    media: BoardMediaSchema.optional(),
    owner: BoardOwnerSchema.optional()
});

const InputSchema = z.object({
    query: z.string().describe('Search query. Example: "summer recipes"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Maximum number of results to return. Example: 25')
});

const OutputSchema = z.object({
    items: z.array(BoardSchema),
    bookmark: z.string().optional().describe('Pagination cursor for the next page of results.')
});

const action = createAction({
    description: "Search the account's own boards.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/search/operation/search_boards_get
            endpoint: '/v5/search/boards',
            params: {
                query: input.query,
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Pinterest API'
            });
        }

        const items = Array.isArray(raw.items) ? raw.items : [];
        const bookmark = raw.bookmark != null && typeof raw.bookmark === 'string' ? raw.bookmark : undefined;

        return {
            items: items.map((item: unknown) => {
                const parsed = BoardSchema.safeParse(item);
                if (!parsed.success) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: 'Unexpected board object format from Pinterest API',
                        details: parsed.error.issues
                    });
                }

                const board = parsed.data;
                return {
                    id: board.id,
                    name: board.name,
                    ...(board.description !== undefined && { description: board.description }),
                    ...(board.privacy !== undefined && { privacy: board.privacy }),
                    ...(board.is_ads_only !== undefined && { is_ads_only: board.is_ads_only }),
                    ...(board.created_at !== undefined && { created_at: board.created_at }),
                    ...(board.board_pins_modified_at !== undefined && { board_pins_modified_at: board.board_pins_modified_at }),
                    ...(board.collaborator_count !== undefined && { collaborator_count: board.collaborator_count }),
                    ...(board.follower_count !== undefined && { follower_count: board.follower_count }),
                    ...(board.pin_count !== undefined && { pin_count: board.pin_count }),
                    ...(board.media !== undefined && {
                        media: {
                            ...(board.media.image_cover_url !== undefined && { image_cover_url: board.media.image_cover_url }),
                            ...(board.media.pin_thumbnail_urls !== undefined && { pin_thumbnail_urls: board.media.pin_thumbnail_urls })
                        }
                    }),
                    ...(board.owner !== undefined && {
                        owner: {
                            ...(board.owner.username !== undefined && { username: board.owner.username })
                        }
                    })
                };
            }),
            ...(bookmark !== undefined && { bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
