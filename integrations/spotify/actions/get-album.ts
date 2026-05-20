import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Spotify ID for the album. Example: "6dVIqQ8qmQ5GBnJ9shOYGE"'),
    market: z.string().optional().describe('An ISO 3166-1 alpha-2 country code. Provide this parameter if you want to apply Track Relinking.')
});

const ProviderImageSchema = z.object({
    url: z.string(),
    height: z.number().nullable(),
    width: z.number().nullable()
});

const ProviderArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    uri: z.string(),
    external_urls: z
        .object({
            spotify: z.string()
        })
        .optional()
});

const ProviderTrackItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    uri: z.string(),
    track_number: z.number(),
    duration_ms: z.number(),
    explicit: z.boolean(),
    artists: z.array(ProviderArtistSchema),
    external_urls: z
        .object({
            spotify: z.string()
        })
        .optional()
});

const ProviderAlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    album_type: z.string(),
    total_tracks: z.number(),
    release_date: z.string(),
    release_date_precision: z.string(),
    type: z.string(),
    uri: z.string(),
    external_urls: z
        .object({
            spotify: z.string()
        })
        .optional(),
    images: z.array(ProviderImageSchema),
    artists: z.array(ProviderArtistSchema),
    tracks: z
        .object({
            items: z.array(ProviderTrackItemSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
            next: z.string().nullable(),
            previous: z.string().nullable()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    album_type: z.string(),
    total_tracks: z.number(),
    release_date: z.string(),
    release_date_precision: z.string(),
    uri: z.string(),
    spotify_url: z.string().optional(),
    images: z.array(
        z.object({
            url: z.string(),
            height: z.number().optional(),
            width: z.number().optional()
        })
    ),
    artists: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            uri: z.string(),
            spotify_url: z.string().optional()
        })
    ),
    tracks: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                type: z.string(),
                uri: z.string(),
                track_number: z.number(),
                duration_ms: z.number(),
                explicit: z.boolean(),
                artists: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        type: z.string(),
                        uri: z.string(),
                        spotify_url: z.string().optional()
                    })
                ),
                spotify_url: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single album from the Spotify catalog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-album',
        group: 'Albums'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.market) {
            params['market'] = input.market;
        }

        // https://developer.spotify.com/documentation/web-api/reference/get-an-album
        const response = await nango.get({
            endpoint: `/v1/albums/${encodeURIComponent(input.id)}`,
            params: params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Album not found',
                id: input.id
            });
        }

        const providerAlbum = ProviderAlbumSchema.parse(response.data);

        return {
            id: providerAlbum.id,
            name: providerAlbum.name,
            album_type: providerAlbum.album_type,
            total_tracks: providerAlbum.total_tracks,
            release_date: providerAlbum.release_date,
            release_date_precision: providerAlbum.release_date_precision,
            uri: providerAlbum.uri,
            ...(providerAlbum.external_urls?.spotify && { spotify_url: providerAlbum.external_urls.spotify }),
            images: providerAlbum.images.map((img) => ({
                url: img.url,
                ...(img.height != null && { height: img.height }),
                ...(img.width != null && { width: img.width })
            })),
            artists: providerAlbum.artists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                type: artist.type,
                uri: artist.uri,
                ...(artist.external_urls?.spotify && { spotify_url: artist.external_urls.spotify })
            })),
            ...(providerAlbum.tracks && {
                tracks: providerAlbum.tracks.items.map((track) => ({
                    id: track.id,
                    name: track.name,
                    type: track.type,
                    uri: track.uri,
                    track_number: track.track_number,
                    duration_ms: track.duration_ms,
                    explicit: track.explicit,
                    artists: track.artists.map((artist) => ({
                        id: artist.id,
                        name: artist.name,
                        type: artist.type,
                        uri: artist.uri,
                        ...(artist.external_urls?.spotify && { spotify_url: artist.external_urls.spotify })
                    })),
                    ...(track.external_urls?.spotify && { spotify_url: track.external_urls.spotify })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
