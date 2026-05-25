import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('The maximum number of items to return. Default: 20. Minimum: 1. Maximum: 50.'),
    offset: z.number().optional().describe('The index of the first item to return. Default: 0.'),
    market: z.string().optional().describe('An ISO 3166-1 alpha-2 country code. Provide this parameter if you want to apply Track Relinking.')
});

const SavedAlbumSchema = z.object({
    added_at: z.string().optional(),
    album: z.object({
        id: z.string(),
        name: z.string(),
        artists: z
            .array(
                z.object({
                    id: z.string(),
                    name: z.string()
                })
            )
            .optional(),
        images: z
            .array(
                z.object({
                    url: z.string(),
                    height: z.number().nullable().optional(),
                    width: z.number().nullable().optional()
                })
            )
            .optional(),
        release_date: z.string().optional(),
        total_tracks: z.number().optional()
    })
});

const ProviderResponseSchema = z.object({
    items: z.array(SavedAlbumSchema),
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    next: z.string().nullable().optional()
});

const AlbumOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    release_date: z.string().optional(),
    total_tracks: z.number().optional(),
    added_at: z.string().optional()
});

const OutputSchema = z.object({
    albums: z.array(AlbumOutputSchema),
    next_offset: z.number().optional().describe('The offset for the next page. Omit if no more pages.')
});

const action = createAction({
    description: "List albums saved in the current user's library.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-albums',
        group: 'Library'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { limit?: number; offset?: number; market?: string } = {};
        if (input.limit !== undefined) {
            params.limit = input.limit;
        }
        if (input.offset !== undefined) {
            params.offset = input.offset;
        }
        if (input.market !== undefined) {
            params.market = input.market;
        }

        // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-albums
        const response = await nango.get({
            endpoint: '/v1/me/albums',
            params: params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const albums = parsed.items.map((item) => {
            const album = item.album;
            const result: z.infer<typeof AlbumOutputSchema> = {
                id: album.id,
                name: album.name
            };

            if (album.artists !== undefined) {
                result.artists = album.artists;
            }

            if (album.images !== undefined) {
                result.images = album.images.map((img) => {
                    const image: { url: string; height?: number; width?: number } = {
                        url: img.url
                    };
                    if (img.height !== null && img.height !== undefined) {
                        image.height = img.height;
                    }
                    if (img.width !== null && img.width !== undefined) {
                        image.width = img.width;
                    }
                    return image;
                });
            }

            if (album.release_date !== undefined) {
                result.release_date = album.release_date;
            }

            if (album.total_tracks !== undefined) {
                result.total_tracks = album.total_tracks;
            }

            if (item.added_at !== undefined) {
                result.added_at = item.added_at;
            }

            return result;
        });

        const output: z.infer<typeof OutputSchema> = {
            albums
        };

        if (parsed.next !== null && parsed.next !== undefined && parsed.next !== '') {
            const nextOffset = parsed.offset + parsed.items.length;
            output.next_offset = nextOffset;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
