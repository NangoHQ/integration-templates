import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationId: z.string().describe('Conversation ID. Example: "ubfBQrDLfPl0NHGCtFJA"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    contactId: z.string(),
    locationId: z.string(),
    deleted: z.boolean(),
    type: z.number(),
    inbox: z.boolean().optional(),
    unreadCount: z.number().optional(),
    assignedTo: z.string().optional(),
    starred: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    contactId: z.string(),
    locationId: z.string(),
    deleted: z.boolean(),
    type: z.number(),
    inbox: z.boolean().optional(),
    unreadCount: z.number().optional(),
    assignedTo: z.string().optional(),
    starred: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single conversation from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/get-conversation
            endpoint: `/conversations/${encodeURIComponent(input.conversationId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversation not found or invalid response.',
                conversationId: input.conversationId
            });
        }

        const providerConversation = ProviderResponseSchema.parse(response.data);

        return {
            id: providerConversation.id,
            contactId: providerConversation.contactId,
            locationId: providerConversation.locationId,
            deleted: providerConversation.deleted,
            type: providerConversation.type,
            ...(providerConversation.inbox !== undefined && { inbox: providerConversation.inbox }),
            ...(providerConversation.unreadCount !== undefined && { unreadCount: providerConversation.unreadCount }),
            ...(providerConversation.assignedTo !== undefined && { assignedTo: providerConversation.assignedTo }),
            ...(providerConversation.starred !== undefined && { starred: providerConversation.starred })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
