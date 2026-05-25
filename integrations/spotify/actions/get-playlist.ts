import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist. Example: "0PUR2D6eCDOIjLIeu9kIcq"'),
    fields: z.string().optional().describe('A comma-separated list of fields to return. Example: "name,description,owner"'),
    market: z.string().optional().describe('An ISO 3166-1 alpha-2 country code to filter results. Example: "US"')
});

const OwnerSchema = z.object({
    id: z.string(),
    display_name: z.string().optional().nullable(),
    type: z.string()
});

const TrackItemSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    type: z.string().optional()
});

const TracksSchema = z.object({
    items: z
        .array(
            z.object({
                track: TrackItemSchema.optional().nullable()
            })
        )
        .optional(),
    total: z.number().optional()
});

const ProviderPlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    owner: OwnerSchema.optional(),
    tracks: TracksSchema.optional(),
    public: z.boolean().optional().nullable(),
    collaborative: z.boolean().optional().nullable(),
    follower_count: z.number().optional().nullable(),
    snapshot_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    track_count: z.number().optional(),
    is_public: z.boolean().optional(),
    is_collaborative: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single playlist from Spotify',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-read-private', 'playlist-read-collaborative'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-playlist
        const response = await nango.get({
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlist_id)}`,
            params: {
                ...(input.fields && { fields: input.fields }),
                ...(input.market && { market: input.market })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Playlist not found',
                playlist_id: input.playlist_id
            });
        }

        const playlist = ProviderPlaylistSchema.parse(response.data);

        return {
            id: playlist.id,
            name: playlist.name,
            ...(playlist.description != null && { description: playlist.description }),
            ...(playlist.owner != null && { owner_id: playlist.owner.id }),
            ...(playlist.owner?.display_name != null && { owner_name: playlist.owner.display_name }),
            ...(playlist.tracks?.total != null && { track_count: playlist.tracks.total }),
            ...(playlist.public != null && { is_public: playlist.public }),
            ...(playlist.collaborative != null && { is_collaborative: playlist.collaborative })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
