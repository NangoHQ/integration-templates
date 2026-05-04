import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The unique identifier of the message to move. Example: "AAMkAGVmMDEz..."'),
    destinationId: z.string().describe('The unique identifier of the destination mail folder. Example: "AAMkAGVmMDEzMjA..."')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    parentFolderId: z.string(),
    subject: z.string().optional().nullable(),
    receivedDateTime: z.string().optional().nullable(),
    sentDateTime: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    parentFolderId: z.string(),
    subject: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional()
});

const action = createAction({
    description: 'Move a message to another mail folder.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/message-move
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}/move`,
            data: {
                destinationId: input.destinationId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'move_failed',
                message: 'Failed to move message',
                messageId: input.messageId
            });
        }

        const movedMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: movedMessage.id,
            parentFolderId: movedMessage.parentFolderId,
            ...(movedMessage.subject != null && { subject: movedMessage.subject }),
            ...(movedMessage.receivedDateTime != null && { receivedDateTime: movedMessage.receivedDateTime }),
            ...(movedMessage.sentDateTime != null && { sentDateTime: movedMessage.sentDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
