import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().int().min(1).max(50).optional().describe('The maximum number of items to return. Default: 20, Maximum: 50.'),
    offset: z.number().int().min(0).optional().describe('The index of the first item to return. Default: 0.'),
    market: z.string().length(2).optional().describe('An ISO 3166-1 alpha-2 country code. Example: "US"')
});

const SavedTrackObjectSchema = z.object({
    added_at: z.string().optional(),
    track: z
        .object({
            id: z.string(),
            name: z.string(),
            uri: z.string().optional(),
            duration_ms: z.number().optional(),
            explicit: z.boolean().optional(),
            popularity: z.number().optional(),
            preview_url: z.string().nullable().optional(),
            track_number: z.number().optional(),
            disc_number: z.number().optional(),
            album: z
                .object({
                    id: z.string(),
                    name: z.string(),
                    uri: z.string().optional(),
                    album_type: z.string().optional(),
                    images: z
                        .array(
                            z.object({
                                url: z.string(),
                                height: z.number().nullable().optional(),
                                width: z.number().nullable().optional()
                            })
                        )
                        .optional()
                })
                .passthrough()
                .optional(),
            artists: z
                .array(
                    z
                        .object({
                            id: z.string(),
                            name: z.string(),
                            uri: z.string().optional()
                        })
                        .passthrough()
                )
                .optional()
        })
        .passthrough()
});

const ProviderResponseSchema = z.object({
    items: z.array(SavedTrackObjectSchema),
    next: z.string().nullable().optional(),
    offset: z.number(),
    total: z.number()
});

const OutputSchema = z.object({
    items: z.array(SavedTrackObjectSchema),
    next_offset: z.number().optional(),
    total: z.number()
});

const action = createAction({
    description: "List tracks saved in the current user's library.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks
            endpoint: '/v1/me/tracks',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.market !== undefined && { market: input.market })
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        const nextOffset = data.next !== null && data.next !== undefined ? data.offset + data.items.length : undefined;

        return {
            items: data.items,
            total: data.total,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
