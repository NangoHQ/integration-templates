import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    position_ms: z.number().int().min(0).describe('Position in milliseconds to seek to. Example: 10000'),
    device_id: z.string().optional().describe('Optional. The ID of the device this command is targeting.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Seek to a specific position in the currently playing track.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/seek-to-position',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { position_ms: number; device_id?: string } = {
            position_ms: input.position_ms
        };
        if (input.device_id !== undefined) {
            params.device_id = input.device_id;
        }

        // https://developer.spotify.com/documentation/web-api/reference/seek-to-position-in-currently-playing-track
        await nango.put({
            endpoint: '/v1/me/player/seek',
            params: params,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
