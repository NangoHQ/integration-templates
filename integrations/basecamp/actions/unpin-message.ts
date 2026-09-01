import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project containing the message. Example: 48644099'),
        messageId: z.number().describe('The ID of the message to unpin. Example: 1069479842')
    })
    .describe('Input parameters for unpinning a message.');

const OutputSchema = z.null().describe('No content is returned on a successful unpin (204 No Content).');

/**
 * @tags: [write]
 * @tagReason: Sends a DELETE request to remove the pinned status from a message.
 */
const action = createAction({
    description: 'Unpin a message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/messages.md
        const response = await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.messageId)}/pin.json`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unpin_failed',
                message: `Failed to unpin message. Provider returned status ${response.status}.`
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
