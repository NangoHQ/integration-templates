import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    raw: z.string().describe('Base64url-encoded RFC 2822 MIME content of the draft message.'),
    threadId: z.string().optional().describe('Optional thread ID to add the draft to an existing thread. Example: "18f3a2b4c5d6e7f8"')
});

const ProviderDraftSchema = z.object({
    id: z.string(),
    message: z
        .object({
            id: z.string(),
            threadId: z.string().optional(),
            labelIds: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created draft.'),
    messageId: z.string().optional().describe('The ID of the message within the draft.'),
    threadId: z.string().optional().describe('The thread ID associated with the draft message.'),
    labelIds: z.array(z.string()).optional().describe('Label IDs applied to the draft message.')
});

const action = createAction({
    description: 'Create a Gmail draft message from RFC 2822 MIME content.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create
            endpoint: '/gmail/v1/users/me/drafts',
            data: {
                message: {
                    raw: input.raw,
                    ...(input.threadId !== undefined && { threadId: input.threadId })
                }
            },
            retries: 3
        });

        const draft = ProviderDraftSchema.parse(response.data);

        return {
            id: draft.id,
            ...(draft.message?.id !== undefined && { messageId: draft.message.id }),
            ...(draft.message?.threadId !== undefined && { threadId: draft.message.threadId }),
            ...(draft.message?.labelIds !== undefined && { labelIds: draft.message.labelIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
