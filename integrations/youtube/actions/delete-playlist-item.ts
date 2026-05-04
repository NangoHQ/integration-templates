import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistItemId: z.string().describe('The ID of the playlist item to delete. Example: "PL1234567890abcdefABCDEF1234567890abcdefAB"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the playlist item was successfully deleted')
});

const action = createAction({
    description: 'Remove an item from a YouTube playlist',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-playlist-item',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/playlistItems/delete
        await nango.delete({
            endpoint: '/youtube/v3/playlistItems',
            params: {
                id: input.playlistItemId
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
