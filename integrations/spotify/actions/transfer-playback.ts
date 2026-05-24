import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    device_id: z.string().describe('The ID of the device to transfer playback to. Example: "e26cf707-53c5-4640-a6d3-3eb0fb2239ad"'),
    play: z.boolean().optional().describe('Whether to ensure playback happens on the new device. Default: false')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Transfer playback to a different Spotify Connect device',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/transfer-playback',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback
        await nango.put({
            endpoint: '/v1/me/player',
            data: {
                device_ids: [input.device_id],
                ...(input.play !== undefined && { play: input.play })
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
