import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel ID to unpin the message from. Example: "C1234567890"'),
    timestamp: z.string().describe('Timestamp of the message to unpin. Example: "1234567890.123456"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    error: z.string().optional().describe('Error message if the request failed')
});

const action = createAction({
    description: 'Remove a pinned message from a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/unpin-message',
        group: 'Pins'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/pins.remove
        const response = await nango.post({
            endpoint: 'pins.remove',
            data: {
                channel: input.channel_id,
                timestamp: input.timestamp
            },
            retries: 3
        });

        return {
            ok: response.data.ok ?? true,
            error: response.data.error ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
