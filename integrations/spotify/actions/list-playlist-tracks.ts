import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist. Example: "3cEYpjA9oz9GiPac4AsH4n"'),
    market: z
        .string()
        .optional()
        .describe('An ISO 3166-1 alpha-2 country code. If a country code is specified, only content that is available in that market will be returned.'),
    fields: z.string().optional().describe('Filters for the query: a comma-separated list of the fields to return. If omitted, all fields are returned.'),
    limit: z.number().int().min(1).max(50).optional().describe('The maximum number of items to return. Default: 20. Minimum: 1. Maximum: 50.'),
    offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('The index of the first item to return. Default:  0 (the first item). Use with limit to get the next set of items.'),
    additional_types: z
        .string()
        .optional()
        .describe('A comma-separated list of item types that your client supports besides the default track type. Valid types are: track and episode.')
});

const SimplifiedArtistSchema = z.object({
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    href: z.string(),
    id: z.string(),
    name: z.string(),
    type: z.string(),
    uri: z.string()
});

const ImageObjectSchema = z.object({
    url: z.string(),
    height: z.number().int().nullable(),
    width: z.number().int().nullable()
});

const AlbumSchema = z.object({
    album_type: z.string(),
    total_tracks: z.number().int(),
    available_markets: z.array(z.string()).optional(),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    href: z.string(),
    id: z.string(),
    images: z.array(ImageObjectSchema),
    name: z.string(),
    release_date: z.string(),
    release_date_precision: z.string(),
    restrictions: z
        .object({
            reason: z.string()
        })
        .optional(),
    type: z.string(),
    uri: z.string(),
    artists: z.array(SimplifiedArtistSchema)
});

const TrackSchema = z.object({
    album: AlbumSchema.optional(),
    artists: z.array(SimplifiedArtistSchema),
    available_markets: z.array(z.string()).optional(),
    disc_number: z.number().int(),
    duration_ms: z.number().int(),
    explicit: z.boolean(),
    external_ids: z
        .object({
            isrc: z.string().optional(),
            ean: z.string().optional(),
            upc: z.string().optional()
        })
        .optional(),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    href: z.string(),
    id: z.string(),
    is_playable: z.boolean().optional(),
    linked_from: z
        .object({
            external_urls: z
                .object({
                    spotify: z.string().optional()
                })
                .optional(),
            href: z.string(),
            id: z.string(),
            uri: z.string()
        })
        .optional(),
    restrictions: z
        .object({
            reason: z.string()
        })
        .optional(),
    name: z.string(),
    popularity: z.number().int().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().int(),
    type: z.string(),
    uri: z.string(),
    is_local: z.boolean()
});

// Episodes have a different shape than tracks; use a permissive fallback so that
// additional_types=episode does not crash the parse. Non-track items are filtered
// out before building the output.
const AnyItemSchema = z.union([TrackSchema, z.object({ type: z.string() }).passthrough()]);

const PlaylistTrackObjectSchema = z.object({
    added_at: z.string().nullable().optional(),
    added_by: z
        .object({
            external_urls: z
                .object({
                    spotify: z.string().optional()
                })
                .optional(),
            href: z.string(),
            id: z.string(),
            type: z.string(),
            uri: z.string()
        })
        .nullable()
        .optional(),
    is_local: z.boolean(),
    track: AnyItemSchema.nullable().optional(),
    item: AnyItemSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    href: z.string(),
    limit: z.number().int(),
    next: z.string().nullable().optional(),
    offset: z.number().int(),
    previous: z.string().nullable().optional(),
    total: z.number().int(),
    items: z.array(PlaylistTrackObjectSchema)
});

const TrackOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string().optional(),
    duration_ms: z.number().int().optional(),
    explicit: z.boolean().optional(),
    popularity: z.number().int().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().int().optional(),
    disc_number: z.number().int().optional(),
    is_local: z.boolean().optional(),
    is_playable: z.boolean().optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            uri: z.string(),
            href: z.string().optional(),
            album_type: z.string().optional(),
            total_tracks: z.number().int().optional(),
            release_date: z.string().optional(),
            release_date_precision: z.string().optional(),
            images: z.array(ImageObjectSchema).optional()
        })
        .optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                uri: z.string(),
                href: z.string().optional(),
                external_urls: z
                    .object({
                        spotify: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    items: z.array(TrackOutputSchema),
    total: z.number().int(),
    next_offset: z.number().int().optional()
});

const action = createAction({
    description: 'List tracks in a Spotify playlist.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-playlist-tracks',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-read-private', 'playlist-read-collaborative'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 20,
            offset: input.offset ?? 0
        };

        if (input.market) {
            params['market'] = input.market;
        }
        if (input.fields) {
            params['fields'] = input.fields;
        }
        if (input.additional_types) {
            params['additional_types'] = input.additional_types;
        }

        const response = await nango.get({
            // https://developer.spotify.com/documentation/web-api/reference/get-playlists-items
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlist_id)}/items`,
            params,
            retries: 3
        });

        const validated = ProviderResponseSchema.parse(response.data);

        return {
            items: validated.items
                .map((item) => {
                    const track = item.item || item.track;
                    // Skip null tracks and non-track items (e.g. episodes when
                    // additional_types=episode is requested). Parse through TrackSchema
                    // to narrow the type without casting.
                    if (!track) {
                        return null;
                    }
                    const parsedTrack = TrackSchema.safeParse(track);
                    if (!parsedTrack.success) {
                        return null;
                    }
                    const t = parsedTrack.data;
                    return {
                        id: t.id,
                        name: t.name,
                        uri: t.uri,
                        href: t.href,
                        duration_ms: t.duration_ms,
                        explicit: t.explicit,
                        popularity: t.popularity,
                        preview_url: t.preview_url,
                        track_number: t.track_number,
                        disc_number: t.disc_number,
                        is_local: item.is_local,
                        is_playable: t.is_playable,
                        album: t.album
                            ? {
                                  id: t.album.id,
                                  name: t.album.name,
                                  uri: t.album.uri,
                                  href: t.album.href,
                                  album_type: t.album.album_type,
                                  total_tracks: t.album.total_tracks,
                                  release_date: t.album.release_date,
                                  release_date_precision: t.album.release_date_precision,
                                  images: t.album.images
                              }
                            : undefined,
                        artists: t.artists?.map((artist) => ({
                            id: artist.id,
                            name: artist.name,
                            uri: artist.uri,
                            href: artist.href,
                            external_urls: artist.external_urls
                                ? {
                                      spotify: artist.external_urls.spotify
                                  }
                                : undefined
                        }))
                    };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null),
            total: validated.total,
            ...(validated.offset + validated.items.length < validated.total && validated.items.length > 0
                ? { next_offset: validated.offset + validated.items.length }
                : undefined)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
