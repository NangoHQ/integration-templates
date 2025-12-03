/**
 * Archives a conversation making it read-only.
 *
 * API Docs: https://api.slack.com/methods/conversations.archive
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ArchiveChannelInput = z.object({
    channel_id: z.string()
        .describe('The channel to archive. Example: "C0A02F9NBCJ"')
});

const ArchiveChannelOutput = z.object({
    ok: z.boolean()
        .describe('Whether the channel was archived successfully')
});

const action = createAction({
    description: 'Archives a conversation making it read-only.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/archive-channel',
        group: 'Channels'
    },

    input: ArchiveChannelInput,
    output: ArchiveChannelOutput,
    scopes: ['channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof ArchiveChannelOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.archive
            endpoint: 'conversations.archive',
            data: {
                channel: input.channel_id
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
