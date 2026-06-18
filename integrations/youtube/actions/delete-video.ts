import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    videoId: z.string().describe('The ID of the video to delete. Example: "dQw4w9WgXcQ"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a YouTube video owned by the authenticated channel.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/videos/delete
        await nango.delete({
            endpoint: '/youtube/v3/videos',
            params: {
                id: input.videoId
            },
            retries: 1
        });

        return {
            success: true,
            message: `Video ${input.videoId} deleted successfully.`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
