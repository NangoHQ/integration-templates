import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist to follow. Example: "5mBo6dx15GhupMndL3T2sk"'),
    public: z.boolean().optional().describe("If true, the playlist will be included in the user's public profile. Default: true")
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the playlist was successfully followed'),
    playlist_id: z.string().describe('The ID of the playlist that was followed')
});

const action = createAction({
    description: 'Follow a playlist on behalf of the current user',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/follow-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/follow-playlist
        await nango.put({
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlist_id)}/followers`,
            data: {
                public: input.public ?? true
            },
            retries: 3
        });

        return {
            success: true,
            playlist_id: input.playlist_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
