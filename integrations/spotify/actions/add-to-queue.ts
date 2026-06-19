import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uri: z.string().describe('Spotify URI of the track or episode to add. Example: "spotify:track:70LcF31zb1H0PyJoS1Sx1r"'),
    device_id: z.string().optional().describe("Optional ID of the device to target. If omitted, the user's currently active device is used.")
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Add a track or episode to the end of the user's current playback queue.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/add-to-queue
        await nango.post({
            endpoint: '/v1/me/player/queue',
            params: {
                uri: input.uri,
                ...(input.device_id !== undefined && { device_id: input.device_id })
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
