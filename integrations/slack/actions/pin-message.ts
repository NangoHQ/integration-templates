import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Channel ID where the message was posted. Example: "C1234567890"'),
    message_timestamp: z.string().describe('Timestamp of the message to pin. Example: "1355517523.000005"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the pin was successfully added')
});

const action = createAction({
    description: 'Pin a specific message in a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/pin-message',
        group: 'Pins'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.slack.dev/reference/methods/pins.add/
            endpoint: 'pins.add',
            data: {
                channel: input.channel_id,
                timestamp: input.message_timestamp
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_error',
                message: response.data.error || 'Failed to pin message',
                slack_error: response.data.error
            });
        }

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
