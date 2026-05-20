import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query string. Example: "Radiohead"'),
    type: z
        .array(z.enum(['track', 'album', 'artist', 'playlist', 'show', 'episode']))
        .min(1)
        .describe('Types of items to search for. At least one type is required.'),
    market: z.string().optional().describe('ISO 3166-1 alpha-2 country code for content restriction. Example: "US"'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results to return per type. Default: 20, Maximum: 50.'),
    offset: z.number().int().min(0).optional().describe('Index of the first result to return. Default: 0.'),
    include_external: z.enum(['audio']).optional().describe('If "audio", response includes any playable audio content.')
});

// Spotify API uses snake_case
const SpotifyPagingObjectSchema = z.object({
    href: z.string(),
    limit: z.number().int(),
    next: z.string().nullable(),
    offset: z.number().int(),
    previous: z.string().nullable(),
    total: z.number().int()
});

const SpotifyImageSchema = z.object({
    url: z.string(),
    height: z.number().int().nullable(),
    width: z.number().int().nullable()
});

const SpotifyTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('track'),
    popularity: z.number().int().optional(),
    explicit: z.boolean().optional(),
    duration_ms: z.number().int().optional(),
    preview_url: z.string().nullable().optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            images: z.array(SpotifyImageSchema).optional()
        })
        .optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const SpotifyAlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('album'),
    album_type: z.string().optional(),
    total_tracks: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const SpotifyArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('artist'),
    popularity: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    genres: z.array(z.string()).optional()
});

const SpotifyPlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('playlist'),
    description: z.string().nullable().optional(),
    owner: z
        .object({
            id: z.string(),
            display_name: z.string().nullable().optional()
        })
        .optional(),
    images: z.array(SpotifyImageSchema).optional(),
    tracks: z
        .object({
            total: z.number().int()
        })
        .optional()
});

const SpotifyShowSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('show'),
    description: z.string().optional(),
    explicit: z.boolean().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    languages: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    total_episodes: z.number().int().optional()
});

const SpotifyEpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    href: z.string(),
    type: z.literal('episode'),
    description: z.string().optional(),
    explicit: z.boolean().optional(),
    duration_ms: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    release_date: z.string().optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const SearchTracksSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyTrackSchema)
});

const SearchAlbumsSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyAlbumSchema)
});

const SearchArtistsSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyArtistSchema)
});

const SearchPlaylistsSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyPlaylistSchema)
});

const SearchShowsSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyShowSchema)
});

const SearchEpisodesSchema = SpotifyPagingObjectSchema.extend({
    items: z.array(SpotifyEpisodeSchema)
});

const ProviderResponseSchema = z.object({
    tracks: SearchTracksSchema.optional(),
    albums: SearchAlbumsSchema.optional(),
    artists: SearchArtistsSchema.optional(),
    playlists: SearchPlaylistsSchema.optional(),
    shows: SearchShowsSchema.optional(),
    episodes: SearchEpisodesSchema.optional()
});

// Normalized output using camelCase for derived/consumer fields
const TrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('track'),
    popularity: z.number().int().optional(),
    explicit: z.boolean().optional(),
    durationMs: z.number().int().optional(),
    previewUrl: z.string().optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            images: z.array(SpotifyImageSchema).optional()
        })
        .optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const AlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('album'),
    albumType: z.string().optional(),
    totalTracks: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const ArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('artist'),
    popularity: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    genres: z.array(z.string()).optional()
});

const PlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('playlist'),
    description: z.string().optional(),
    owner: z
        .object({
            id: z.string(),
            displayName: z.string().optional()
        })
        .optional(),
    images: z.array(SpotifyImageSchema).optional(),
    tracksTotal: z.number().int().optional()
});

const ShowSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('show'),
    description: z.string().optional(),
    explicit: z.boolean().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    languages: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    totalEpisodes: z.number().int().optional()
});

const EpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.literal('episode'),
    description: z.string().optional(),
    explicit: z.boolean().optional(),
    durationMs: z.number().int().optional(),
    images: z.array(SpotifyImageSchema).optional(),
    releaseDate: z.string().optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const PagingInfoSchema = z.object({
    total: z.number().int(),
    offset: z.number().int(),
    limit: z.number().int(),
    nextOffset: z.number().int().optional(),
    hasMore: z.boolean()
});

const OutputSchema = z.object({
    query: z.string(),
    types: z.array(z.enum(['track', 'album', 'artist', 'playlist', 'show', 'episode'])),
    tracks: z.object({ items: z.array(TrackSchema), paging: PagingInfoSchema }).optional(),
    albums: z.object({ items: z.array(AlbumSchema), paging: PagingInfoSchema }).optional(),
    artists: z.object({ items: z.array(ArtistSchema), paging: PagingInfoSchema }).optional(),
    playlists: z.object({ items: z.array(PlaylistSchema), paging: PagingInfoSchema }).optional(),
    shows: z.object({ items: z.array(ShowSchema), paging: PagingInfoSchema }).optional(),
    episodes: z.object({ items: z.array(EpisodeSchema), paging: PagingInfoSchema }).optional()
});

function getNextOffset(paging: { offset: number; limit: number; next: string | null }): number | undefined {
    if (!paging.next) {
        return undefined;
    }
    return paging.offset + paging.limit;
}

function mapPagingInfo<T extends { offset: number; limit: number; next: string | null; total: number }>(paging: T) {
    const nextOffset = getNextOffset(paging);
    return {
        total: paging.total,
        offset: paging.offset,
        limit: paging.limit,
        ...(nextOffset !== undefined && { nextOffset }),
        hasMore: paging.next !== null
    };
}

const action = createAction({
    description: 'Search the Spotify catalog for tracks, albums, artists, playlists, shows, or episodes.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/search',
        group: 'Search'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const typeString = input.type.join(',');

        // https://developer.spotify.com/documentation/web-api/reference/search
        const response = await nango.get({
            endpoint: '/v1/search',
            params: {
                q: input.query,
                type: typeString,
                ...(input.market !== undefined && { market: input.market }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.include_external !== undefined && { include_external: input.include_external })
            },
            retries: 3
        });

        const rawData = ProviderResponseSchema.parse(response.data);

        const result: z.infer<typeof OutputSchema> = {
            query: input.query,
            types: input.type
        };

        if (rawData.tracks) {
            result.tracks = {
                items: rawData.tracks.items.map((track) => ({
                    id: track.id,
                    name: track.name,
                    uri: track.uri,
                    type: track.type,
                    ...(track.popularity !== undefined && { popularity: track.popularity }),
                    ...(track.explicit !== undefined && { explicit: track.explicit }),
                    ...(track.duration_ms !== undefined && { durationMs: track.duration_ms }),
                    ...(track.preview_url != null && { previewUrl: track.preview_url }),
                    ...(track.album !== undefined && { album: track.album }),
                    ...(track.artists !== undefined && { artists: track.artists })
                })),
                paging: mapPagingInfo(rawData.tracks)
            };
        }

        if (rawData.albums) {
            result.albums = {
                items: rawData.albums.items.map((album) => ({
                    id: album.id,
                    name: album.name,
                    uri: album.uri,
                    type: album.type,
                    ...(album.album_type !== undefined && { albumType: album.album_type }),
                    ...(album.total_tracks !== undefined && { totalTracks: album.total_tracks }),
                    ...(album.images !== undefined && { images: album.images }),
                    ...(album.artists !== undefined && { artists: album.artists })
                })),
                paging: mapPagingInfo(rawData.albums)
            };
        }

        if (rawData.artists) {
            result.artists = {
                items: rawData.artists.items.map((artist) => ({
                    id: artist.id,
                    name: artist.name,
                    uri: artist.uri,
                    type: artist.type,
                    ...(artist.popularity !== undefined && { popularity: artist.popularity }),
                    ...(artist.images !== undefined && { images: artist.images }),
                    ...(artist.genres !== undefined && { genres: artist.genres })
                })),
                paging: mapPagingInfo(rawData.artists)
            };
        }

        if (rawData.playlists) {
            result.playlists = {
                items: rawData.playlists.items.map((playlist) => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                    type: playlist.type,
                    ...(playlist.description != null && { description: playlist.description }),
                    ...(playlist.owner !== undefined && {
                        owner: {
                            id: playlist.owner.id,
                            ...(playlist.owner.display_name != null && { displayName: playlist.owner.display_name })
                        }
                    }),
                    ...(playlist.images !== undefined && { images: playlist.images }),
                    ...(playlist.tracks !== undefined && { tracksTotal: playlist.tracks.total })
                })),
                paging: mapPagingInfo(rawData.playlists)
            };
        }

        if (rawData.shows) {
            result.shows = {
                items: rawData.shows.items.map((show) => ({
                    id: show.id,
                    name: show.name,
                    uri: show.uri,
                    type: show.type,
                    ...(show.description !== undefined && { description: show.description }),
                    ...(show.explicit !== undefined && { explicit: show.explicit }),
                    ...(show.images !== undefined && { images: show.images }),
                    ...(show.languages !== undefined && { languages: show.languages }),
                    ...(show.publisher !== undefined && { publisher: show.publisher }),
                    ...(show.total_episodes !== undefined && { totalEpisodes: show.total_episodes })
                })),
                paging: mapPagingInfo(rawData.shows)
            };
        }

        if (rawData.episodes) {
            result.episodes = {
                items: rawData.episodes.items.map((episode) => ({
                    id: episode.id,
                    name: episode.name,
                    uri: episode.uri,
                    type: episode.type,
                    ...(episode.description !== undefined && { description: episode.description }),
                    ...(episode.explicit !== undefined && { explicit: episode.explicit }),
                    ...(episode.duration_ms !== undefined && { durationMs: episode.duration_ms }),
                    ...(episode.images !== undefined && { images: episode.images }),
                    ...(episode.release_date !== undefined && { releaseDate: episode.release_date }),
                    ...(episode.show !== undefined && { show: episode.show })
                })),
                paging: mapPagingInfo(rawData.episodes)
            };
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
