import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The Judge.me internal identifier of the webhook subscription to remove. Example: 12345')
    })
    .describe('Input to remove a webhook subscription by its Judge.me id.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a webhook subscription from the store.
 * @pitfalls: Throws an HTTP error when the webhook id does not exist or has already been deleted.
 */
const action = createAction({
    description: 'Remove a webhook subscription by id.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the webhook was removed.'),
    scopes: ['write_settings'],

    exec: async (nango, input): Promise<null> => {
        // https://judge.me/api/docs
        await nango.delete({
            endpoint: 'api/v1/webhooks',
            data: {
                id: input.id
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
