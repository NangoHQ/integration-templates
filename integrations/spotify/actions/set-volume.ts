import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    volume_percent: z.number().int().min(0).max(100).describe('The volume to set. Must be between 0 and 100 inclusive.'),
    device_id: z
        .string()
        .optional()
        .describe("The ID of the device this command is targeting. If not supplied, the user's currently active device is the target.")
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Set the volume for the user's current playback device.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/set-volume',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/set-playback-volume
        await nango.put({
            endpoint: '/v1/me/player/volume',
            params: {
                volume_percent: input.volume_percent.toString(),
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
