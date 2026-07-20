import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationId: z.string().check(z.describe('Conversation ID. Example: "tDtDnQdgm2LXpyiqYvZ6"')),
    locationId: z.string().check(z.describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"')),
    unreadCount: z.number().optional().check(z.describe('Count of unread messages in the conversation. Set to 0 to mark as read.')),
    starred: z.boolean().optional().check(z.describe('Starred status of the conversation.')),
    feedback: z.object({}).passthrough().optional().check(z.describe('Optional feedback object.'))
});

const ProviderConversationSchema = z.object({
    id: z.string().optional(),
    locationId: z.string().optional(),
    contactId: z.string().optional(),
    assignedTo: z.string().optional(),
    userId: z.string().optional(),
    lastMessageBody: z.string().optional(),
    lastMessageDate: z.union([z.string(), z.number()]).optional(),
    lastMessageType: z.union([z.string(), z.number()]).optional(),
    unreadCount: z.number().optional(),
    inbox: z.boolean().optional(),
    starred: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    conversation: ProviderConversationSchema
});

const OutputSchema = z.object({
    success: z.boolean(),
    conversation: z.object({
        id: z.string().optional(),
        locationId: z.string().optional(),
        contactId: z.string().optional(),
        assignedTo: z.string().optional(),
        userId: z.string().optional(),
        lastMessageBody: z.string().optional(),
        lastMessageDate: z.union([z.string(), z.number()]).optional(),
        lastMessageType: z.union([z.string(), z.number()]).optional(),
        unreadCount: z.number().optional(),
        inbox: z.boolean().optional(),
        starred: z.boolean().optional(),
        deleted: z.boolean().optional()
    })
});

interface UpdateConversationBody {
    locationId: string;
    unreadCount?: number;
    starred?: boolean;
    feedback?: Record<string, unknown>;
}

const action = createAction({
    description: 'Update a conversation in HighLevel (e.g. mark read/unread).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations.write'],

    exec: async (nango, input): Promise<z.output<typeof OutputSchema>> => {
        const data: UpdateConversationBody = {
            locationId: input.locationId
        };

        if (input.unreadCount !== undefined) {
            data.unreadCount = input.unreadCount;
        }

        if (input.starred !== undefined) {
            data.starred = input.starred;
        }

        if (input.feedback !== undefined) {
            data.feedback = input.feedback;
        }

        // https://highlevel.stoplight.io/docs/integrations/
        const response = await nango.put({
            endpoint: `/conversations/${encodeURIComponent(input.conversationId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data,
            retries: 1
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response did not match the expected schema.',
                details: parsed.error.issues
            });
        }

        const providerConversation = parsed.data.conversation;

        return {
            success: parsed.data.success,
            conversation: {
                ...(providerConversation.id !== undefined && { id: providerConversation.id }),
                ...(providerConversation.locationId !== undefined && { locationId: providerConversation.locationId }),
                ...(providerConversation.contactId !== undefined && { contactId: providerConversation.contactId }),
                ...(providerConversation.assignedTo !== undefined && { assignedTo: providerConversation.assignedTo }),
                ...(providerConversation.userId !== undefined && { userId: providerConversation.userId }),
                ...(providerConversation.lastMessageBody !== undefined && { lastMessageBody: providerConversation.lastMessageBody }),
                ...(providerConversation.lastMessageDate !== undefined && { lastMessageDate: providerConversation.lastMessageDate }),
                ...(providerConversation.lastMessageType !== undefined && { lastMessageType: providerConversation.lastMessageType }),
                ...(providerConversation.unreadCount !== undefined && { unreadCount: providerConversation.unreadCount }),
                ...(providerConversation.inbox !== undefined && { inbox: providerConversation.inbox }),
                ...(providerConversation.starred !== undefined && { starred: providerConversation.starred }),
                ...(providerConversation.deleted !== undefined && { deleted: providerConversation.deleted })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
