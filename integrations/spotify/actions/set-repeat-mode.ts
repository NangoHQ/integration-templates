import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    state: z.enum(['track', 'context', 'off']).describe('The repeat mode to set. Can be track, context, or off.'),
    device_id: z
        .string()
        .optional()
        .describe('The ID of the device this command is targeting. If not supplied, the user’s currently active device is the target.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the repeat mode was successfully set.')
});

const action = createAction({
    description: "Set the repeat mode for the user's playback.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/put-repeat-mode
        await nango.put({
            endpoint: '/v1/me/player/repeat',
            params: {
                state: input.state,
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
