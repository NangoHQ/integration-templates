import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        topic_id: z.number().describe('The unique identifier of the discussion topic to delete. Example: 12345')
    })
    .describe('Input for deleting a discussion forum topic in Freshdesk.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a discussion forum topic from Freshdesk.
 */
const action = createAction({
    description: 'Delete a discussion forum topic in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the topic was successfully deleted.'),

    exec: async (nango, input): Promise<null> => {
        const config = {
            // https://developers.freshdesk.com/api/#delete_topic
            endpoint: `/api/v2/discussions/topics/${encodeURIComponent(String(input.topic_id))}`,
            retries: 10
        };

        await nango.delete(config);

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
