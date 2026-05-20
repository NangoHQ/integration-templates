import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    device_id: z.string().optional().describe('The ID of the device to pause playback on. If omitted, playback pauses on the currently active device.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Pause the user's Spotify playback.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/pause-playback',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/pause-a-users-playback
        await nango.put({
            endpoint: '/v1/me/player/pause',
            params: {
                ...(input.device_id !== undefined && { device_id: input.device_id })
            },
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
