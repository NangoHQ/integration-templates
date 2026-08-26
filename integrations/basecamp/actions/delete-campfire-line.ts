import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The project (bucket) ID that contains the Campfire.'),
        chatId: z.string().describe('The Campfire (chat) ID that contains the line.'),
        lineId: z.string().describe('The Campfire line ID to permanently delete.')
    })
    .describe('Parameters to permanently delete a Campfire line.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a Campfire line with no recovery path.
 * @pitfalls: Only the line creator or an admin can delete a line; permission violations return 403 Forbidden.
 */
const action = createAction({
    description: 'Permanently delete a Campfire line.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content returned on successful deletion.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/campfires.md
        await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/chats/${encodeURIComponent(input.chatId)}/lines/${encodeURIComponent(input.lineId)}.json`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
