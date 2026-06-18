import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist to unfollow. Example: "5mBo6dx15GhupMndL3T2sk"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the playlist was successfully unfollowed'),
    playlist_id: z.string().describe('The ID of the playlist that was unfollowed')
});

const action = createAction({
    description: 'Unfollow a playlist on behalf of the current user',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/unfollow-playlist
        await nango.delete({
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlist_id)}/followers`,
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
