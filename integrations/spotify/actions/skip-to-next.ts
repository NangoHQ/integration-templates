import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deviceId: z
        .string()
        .optional()
        .describe("The id of the device this command is targeting. If not supplied, the user's currently active device is the target.")
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the playback was successfully skipped to the next track.')
});

const action = createAction({
    description: "Skips to the next track in the user's queue.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/skip-playback-to-next-track
        await nango.post({
            endpoint: '/v1/me/player/next',
            params: {
                ...(input.deviceId !== undefined && { device_id: input.deviceId })
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
