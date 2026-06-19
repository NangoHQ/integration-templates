import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The Intercom conversation ID to reopen. Example: "12345678"'),
    admin_id: z.string().describe('The admin ID who is reopening the conversation. Example: "87654321"')
});

const ConversationPartSchema = z.object({
    id: z.string(),
    type: z.string(),
    part_type: z.string().optional(),
    message_type: z.string().optional(),
    body: z.string().nullable().optional(),
    created_at: z.number()
});

const ConversationPartsResponseSchema = z.object({
    type: z.string(),
    conversation_parts: z.object({
        type: z.string(),
        conversation_parts: z.array(ConversationPartSchema),
        total_count: z.number()
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    conversation_id: z.string(),
    part_id: z.string().optional()
});

const action = createAction({
    description: 'Reopen a closed conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_conversations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations
        const response = await nango.post({
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/parts`,
            data: {
                type: 'admin',
                message_type: 'open',
                admin_id: input.admin_id
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const partsData = ConversationPartsResponseSchema.parse(response.data);

        // Find the part that represents the open action
        const openPart = partsData.conversation_parts.conversation_parts.find((part) => part.part_type === 'open');

        return {
            success: true,
            conversation_id: input.conversation_id,
            ...(openPart?.id && { part_id: openPart.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
