import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project containing the Campfire.'),
        chatId: z.number().describe('The ID of the Campfire chat.'),
        lineId: z.number().describe('The ID of the Campfire line to update.'),
        content: z.string().describe('The new content for the Campfire line.')
    })
    .describe('Input for updating a Campfire line.');

/**
 * @tags: [write]
 * @tagReason: Updates the content of an existing Campfire line.
 * @pitfalls: Only the line creator can edit it, and plain text lines become rich text after editing.
 */
const action = createAction({
    description: "Edit a Campfire line's content.",
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),

    exec: async (nango, input) => {
        await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/chats/${encodeURIComponent(input.chatId)}/lines/${encodeURIComponent(input.lineId)}.json`,
            data: {
                content: input.content
            },
            retries: 3
        });
        return null;
    }
});

export default action;
