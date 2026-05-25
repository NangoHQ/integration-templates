import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    device_id: z
        .string()
        .optional()
        .describe("The ID of the device this command is targeting. If not supplied, the user's currently active device is the target.")
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the operation was successful')
});

const action = createAction({
    description: "Skip to the previous track in the user's queue",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/skip-to-previous',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/skip-users-playback-to-previous-track
        await nango.post({
            endpoint: '/v1/me/player/previous',
            params: {
                ...(input.device_id !== undefined && { device_id: input.device_id })
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
