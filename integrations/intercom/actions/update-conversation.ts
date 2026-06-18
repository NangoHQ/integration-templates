import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    read: z.boolean().optional()
});

const ConversationPartSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        body: z.string().nullable().optional(),
        created_at: z.number(),
        updated_at: z.number()
    })
    .passthrough();

const ConversationPartsSchema = z
    .object({
        type: z.string(),
        conversation_parts: z.array(ConversationPartSchema)
    })
    .passthrough();

const ProviderConversationSchema = z
    .object({
        id: z.string(),
        title: z.string().nullable().optional(),
        state: z.enum(['open', 'closed', 'snoozed']),
        read: z.boolean(),
        created_at: z.number(),
        updated_at: z.number(),
        custom_attributes: z.record(z.string(), z.unknown()).optional(),
        conversation_parts: ConversationPartsSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    state: z.enum(['open', 'closed', 'snoozed']),
    read: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    custom_attributes: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update mutable properties on a conversation such as custom attributes or read status',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.custom_attributes !== undefined) {
            data['custom_attributes'] = input.custom_attributes;
        }

        if (input.read !== undefined) {
            data['read'] = input.read;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations
        const response = await nango.put({
            endpoint: `/conversations/${encodeURIComponent(input.id)}`,
            data: data,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const providerConversation = ProviderConversationSchema.parse(response.data);

        return {
            id: providerConversation.id,
            state: providerConversation.state,
            read: providerConversation.read,
            created_at: providerConversation.created_at,
            updated_at: providerConversation.updated_at,
            ...(providerConversation.title != null && { title: providerConversation.title }),
            ...(providerConversation.custom_attributes !== undefined && {
                custom_attributes: providerConversation.custom_attributes
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
