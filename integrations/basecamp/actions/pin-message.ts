import { z } from 'zod';
import { createAction } from 'nango';

/**
 * @tags: [write]
 * @tagReason: POST request that pins a message to the top of the message board.
 */
const action = createAction({
    description: 'Pin a message to the top of the message board.',
    version: '1.0.0',
    input: z
        .object({
            projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the message board.'),
            messageId: z.number().describe('The ID of the message to pin to the top of the message board.')
        })
        .describe('Input to pin a message to the top of a message board.'),
    output: z.null().describe('No content returned on success.'),
    scopes: [],
    exec: async (nango, input): Promise<null> => {
        await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/messages.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.messageId)}/pin.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
