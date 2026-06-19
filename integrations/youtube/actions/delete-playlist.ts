import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The YouTube playlist ID to delete. Example: "PLxxxxxxxxxxxxxxxxxxxxxxxxxxx"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    playlistId: z.string()
});

const action = createAction({
    description: 'Delete a YouTube playlist by playlist ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/playlists/delete
        await nango.delete({
            endpoint: '/youtube/v3/playlists',
            params: {
                id: input.playlistId
            },
            retries: 10
        });

        return {
            success: true,
            playlistId: input.playlistId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
