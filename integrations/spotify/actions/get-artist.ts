import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Spotify ID for the artist. Example: "4Z8W4fKeB5YxbusRsdQVPb"')
});

const ProviderArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('artist'),
    uri: z.string(),
    href: z.string(),
    external_urls: z
        .object({
            spotify: z.string()
        })
        .passthrough()
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
    followers: z
        .object({
            href: z.string().nullable().optional(),
            total: z.number()
        })
        .passthrough()
        .optional(),
    popularity: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('artist'),
    uri: z.string(),
    href: z.string(),
    external_urls: z
        .object({
            spotify: z.string()
        })
        .passthrough()
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
    followers: z
        .object({
            href: z.string().nullable().optional(),
            total: z.number()
        })
        .passthrough()
        .optional(),
    popularity: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single artist from the Spotify catalog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-artist',
        group: 'Artists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-an-artist
        const response = await nango.get({
            endpoint: `/v1/artists/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Artist not found',
                id: input.id
            });
        }

        const providerArtist = ProviderArtistSchema.parse(response.data);

        return {
            id: providerArtist.id,
            name: providerArtist.name,
            type: providerArtist.type,
            uri: providerArtist.uri,
            href: providerArtist.href,
            ...(providerArtist.external_urls !== undefined && { external_urls: providerArtist.external_urls }),
            ...(providerArtist.genres !== undefined && { genres: providerArtist.genres }),
            ...(providerArtist.images !== undefined && {
                images: providerArtist.images.map((img) => ({
                    url: img.url,
                    ...(img.height !== null && { height: img.height }),
                    ...(img.width !== null && { width: img.width })
                }))
            }),
            ...(providerArtist.followers !== undefined && { followers: providerArtist.followers }),
            ...(providerArtist.popularity !== undefined && { popularity: providerArtist.popularity })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
