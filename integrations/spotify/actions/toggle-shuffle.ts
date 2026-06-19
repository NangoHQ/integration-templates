import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    state: z.boolean().describe('Whether shuffle should be enabled (true) or disabled (false)'),
    device_id: z.string().optional().describe("Optional device ID to target. If not provided, the user's currently active device is targeted")
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Toggle shuffle mode on or off for the user's playback",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/toggle-playback-shuffle
        await nango.put({
            endpoint: '/v1/me/player/shuffle',
            params: {
                state: input.state.toString(),
                ...(input.device_id !== undefined && { device_id: input.device_id })
            },
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
