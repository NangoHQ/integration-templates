import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    threadId: z.string().describe('The ID of the thread to modify. Example: "123abc456def"'),
    addLabelIds: z.array(z.string()).optional().describe('A list of label IDs to add to the thread.'),
    removeLabelIds: z.array(z.string()).optional().describe('A list of label IDs to remove from the thread.')
});

const ThreadSchema = z.object({
    id: z.string(),
    historyId: z.string().optional(),
    messages: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the modified thread.'),
    historyId: z.string().optional().describe('The history ID of the thread.'),
    messages: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Add and remove labels across a Gmail thread.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((!input.addLabelIds || input.addLabelIds.length === 0) && (!input.removeLabelIds || input.removeLabelIds.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of addLabelIds or removeLabelIds must be provided with at least one label ID.'
            });
        }

        const requestBody: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
        if (input.addLabelIds && input.addLabelIds.length > 0) {
            requestBody.addLabelIds = input.addLabelIds;
        }
        if (input.removeLabelIds && input.removeLabelIds.length > 0) {
            requestBody.removeLabelIds = input.removeLabelIds;
        }

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/modify
        const response = await nango.post({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(input.threadId)}/modify`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Thread not found or could not be modified.',
                threadId: input.threadId
            });
        }

        const thread = ThreadSchema.parse(response.data);

        return {
            id: thread.id,
            ...(thread.historyId && { historyId: thread.historyId }),
            ...(thread.messages && { messages: thread.messages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
