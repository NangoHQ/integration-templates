import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (the `after` value from the previous response). Omit for the first page.')
});

const ArtistSchema = z.object({
    id: z.string().describe('The Spotify ID for the artist'),
    name: z.string().describe('The name of the artist'),
    uri: z.string().describe('The Spotify URI for the artist'),
    href: z.string().describe('A link to the Web API endpoint providing full details of the artist'),
    type: z.literal('artist'),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .passthrough()
        .optional(),
    followers: z
        .object({
            href: z.string().nullable().optional(),
            total: z.number()
        })
        .optional(),
    genres: z.array(z.string()).optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            })
        )
        .optional(),
    popularity: z.number().optional()
});

const ProviderResponseSchema = z.object({
    artists: z.object({
        items: z.array(ArtistSchema),
        next: z.string().nullable().optional(),
        total: z.number(),
        cursors: z
            .object({
                after: z.string().nullable().optional()
            })
            .optional(),
        limit: z.number(),
        href: z.string()
    })
});

const OutputItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('artist'),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    followers: z
        .object({
            total: z.number()
        })
        .optional(),
    genres: z.array(z.string()).optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable().optional(),
                width: z.number().nullable().optional()
            })
        )
        .optional(),
    popularity: z.number().optional()
});

const OutputSchema = z.object({
    artists: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List artists followed by the current user',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-artists',
        group: 'Artists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-follow-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-followed
        const response = await nango.get({
            endpoint: '/v1/me/following',
            params: {
                type: 'artist',
                limit: 50,
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Spotify API'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            artists: parsed.artists.items.map((artist) => ({
                id: artist.id,
                name: artist.name,
                uri: artist.uri,
                href: artist.href,
                type: artist.type,
                ...(artist.external_urls !== undefined && {
                    external_urls: {
                        ...(artist.external_urls.spotify !== undefined && {
                            spotify: artist.external_urls.spotify
                        })
                    }
                }),
                ...(artist.followers !== undefined && {
                    followers: {
                        total: artist.followers.total
                    }
                }),
                ...(artist.genres !== undefined && { genres: artist.genres }),
                ...(artist.images !== undefined && {
                    images: artist.images.map((img) => ({
                        url: img.url,
                        ...(img.height !== undefined && img.height !== null && { height: img.height }),
                        ...(img.width !== undefined && img.width !== null && { width: img.width })
                    }))
                }),
                ...(artist.popularity !== undefined && { popularity: artist.popularity })
            })),
            ...(parsed.artists.cursors?.after !== undefined &&
                parsed.artists.cursors.after !== null && {
                    next_cursor: parsed.artists.cursors.after
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
