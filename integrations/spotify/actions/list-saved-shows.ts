import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().int().min(1).max(50).optional().describe('The maximum number of items to return. Default: 20. Minimum: 1. Maximum: 50.'),
    offset: z.number().int().min(0).optional().describe('The index of the first item to return. Default: 0.'),
    market: z
        .string()
        .optional()
        .describe('An ISO 3166-1 alpha-2 country code. If a country code is specified, only content that is available in that market is returned.')
});

const ShowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    publisher: z.string().optional(),
    explicit: z.boolean().optional(),
    total_episodes: z.number().int().optional()
});

const SavedShowItemSchema = z.object({
    added_at: z.string().optional(),
    show: ShowSchema.optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(SavedShowItemSchema),
    total: z.number().int().optional(),
    offset: z.number().int().optional(),
    limit: z.number().int().optional()
});

const OutputSchema = z.object({
    items: z.array(ShowSchema),
    next_offset: z.number().int().optional().describe('Offset for the next page, if more results are available')
});

const action = createAction({
    description: "List shows (podcasts) saved in the current user's library",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-shows
        const response = await nango.get({
            endpoint: '/v1/me/shows',
            params: {
                ...(input.limit !== undefined && { limit: input.limit.toString() }),
                ...(input.offset !== undefined && { offset: input.offset.toString() }),
                ...(input.market !== undefined && { market: input.market })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.items
            .filter((item) => item.show !== undefined)
            .map((item) => {
                const show = item.show!;
                return {
                    id: show.id,
                    name: show.name,
                    ...(show.description !== undefined && { description: show.description }),
                    ...(show.publisher !== undefined && { publisher: show.publisher }),
                    ...(show.explicit !== undefined && { explicit: show.explicit }),
                    ...(show.total_episodes !== undefined && { total_episodes: show.total_episodes })
                };
            });

        // Calculate next offset for pagination
        const currentOffset = input.offset || 0;
        const currentLimit = input.limit || 20;
        const total = providerData.total || 0;
        const nextOffset = currentOffset + items.length < total ? currentOffset + currentLimit : undefined;

        return {
            items,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
