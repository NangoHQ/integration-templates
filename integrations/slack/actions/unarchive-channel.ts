import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel ID to unarchive. Example: "C02MB5ZABA7"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the unarchive request was successful')
});

const action = createAction({
    description: 'Restore an archived conversation so members can use it again',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/unarchive-channel',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.unarchive
            endpoint: 'conversations.unarchive',
            data: {
                channel: input.channel_id
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'unarchive_failed',
                message: response.data?.error || 'Failed to unarchive channel',
                channel_id: input.channel_id
            });
        }

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
