import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(1000).describe('The IDs of the messages to modify. Maximum 1000.'),
    addLabelIds: z.array(z.string()).optional().describe('Label IDs to add to all messages.'),
    removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove from all messages.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the batch modification was successful.'),
    modifiedCount: z.number().describe('Number of messages modified.')
});

const action = createAction({
    description: 'Add and remove labels on multiple Gmail messages at once.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((!input.addLabelIds || input.addLabelIds.length === 0) && (!input.removeLabelIds || input.removeLabelIds.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of addLabelIds or removeLabelIds must be provided with at least one label ID'
            });
        }

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchModify
        await nango.post({
            endpoint: '/gmail/v1/users/me/messages/batchModify',
            data: {
                ids: input.ids,
                ...(input.addLabelIds && input.addLabelIds.length > 0 && { addLabelIds: input.addLabelIds }),
                ...(input.removeLabelIds && input.removeLabelIds.length > 0 && { removeLabelIds: input.removeLabelIds })
            },
            retries: 3
        });

        return {
            success: true,
            modifiedCount: input.ids.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
