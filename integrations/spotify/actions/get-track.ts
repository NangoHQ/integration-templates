import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Spotify track ID. Example: "70LcF31zb1H0PyJoS1Sx1r"'),
    market: z
        .union([z.string().length(2), z.literal('from_token')])
        .optional()
        .describe('Optional ISO 3166-1 alpha-2 country code for content restrictions, or "from_token". Example: "US"')
});

// Raw Spotify Track response fields we care about
const ArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string().optional(),
    href: z.string().optional()
});

const AlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    album_type: z.string().optional(),
    total_tracks: z.number().optional(),
    uri: z.string().optional(),
    href: z.string().optional()
});

const ProviderTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string().optional(),
    href: z.string().optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    popularity: z.number().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().optional(),
    disc_number: z.number().optional(),
    type: z.literal('track'),
    artists: z.array(ArtistSchema),
    album: AlbumSchema.optional()
});

// Normalized output
const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string().optional(),
    href: z.string().optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    popularity: z.number().optional(),
    preview_url: z.string().optional(),
    track_number: z.number().optional(),
    disc_number: z.number().optional(),
    type: z.literal('track'),
    artists: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            uri: z.string().optional(),
            href: z.string().optional()
        })
    ),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            album_type: z.string().optional(),
            total_tracks: z.number().optional(),
            uri: z.string().optional(),
            href: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single track from the Spotify catalog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-track',
        group: 'Tracks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-track
        const response = await nango.get({
            endpoint: `/v1/tracks/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.market && { market: input.market })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Track not found',
                id: input.id
            });
        }

        const providerTrack = ProviderTrackSchema.parse(response.data);

        return {
            id: providerTrack.id,
            name: providerTrack.name,
            type: providerTrack.type,
            ...(providerTrack.uri && { uri: providerTrack.uri }),
            ...(providerTrack.href && { href: providerTrack.href }),
            ...(providerTrack.duration_ms !== undefined && { duration_ms: providerTrack.duration_ms }),
            ...(providerTrack.explicit !== undefined && { explicit: providerTrack.explicit }),
            ...(providerTrack.popularity !== undefined && { popularity: providerTrack.popularity }),
            ...(providerTrack.preview_url != null && { preview_url: providerTrack.preview_url }),
            ...(providerTrack.track_number !== undefined && { track_number: providerTrack.track_number }),
            ...(providerTrack.disc_number !== undefined && { disc_number: providerTrack.disc_number }),
            artists: providerTrack.artists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                ...(artist.uri && { uri: artist.uri }),
                ...(artist.href && { href: artist.href })
            })),
            ...(providerTrack.album && {
                album: {
                    id: providerTrack.album.id,
                    name: providerTrack.album.name,
                    ...(providerTrack.album.album_type && { album_type: providerTrack.album.album_type }),
                    ...(providerTrack.album.total_tracks !== undefined && { total_tracks: providerTrack.album.total_tracks }),
                    ...(providerTrack.album.uri && { uri: providerTrack.album.uri }),
                    ...(providerTrack.album.href && { href: providerTrack.album.href })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
