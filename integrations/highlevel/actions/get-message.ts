import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Message ID. Example: "ve9EPM428h8vShlRW1KT"')
});

const ProviderMessageSchema = z
    .object({
        id: z.string(),
        type: z.number().optional(),
        messageType: z.string().optional(),
        locationId: z.string().optional(),
        contactId: z.string().optional(),
        conversationId: z.string().optional(),
        dateAdded: z.string().optional(),
        dateUpdated: z.string().optional(),
        body: z.string().optional(),
        direction: z.string().optional(),
        status: z.string().optional(),
        contentType: z.string().optional(),
        attachments: z.array(z.string()).optional(),
        meta: z.object({}).passthrough().optional(),
        source: z.string().optional(),
        userId: z.string().optional(),
        conversationProviderId: z.string().optional(),
        chatWidgetId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        activity: z.object({}).passthrough().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    message: ProviderMessageSchema
});

const OutputSchema = z
    .object({
        id: z.string(),
        type: z.number().optional(),
        messageType: z.string().optional(),
        locationId: z.string().optional(),
        contactId: z.string().optional(),
        conversationId: z.string().optional(),
        dateAdded: z.string().optional(),
        dateUpdated: z.string().optional(),
        body: z.string().optional(),
        direction: z.string().optional(),
        status: z.string().optional(),
        contentType: z.string().optional(),
        attachments: z.array(z.string()).optional(),
        meta: z.object({}).passthrough().optional(),
        source: z.string().optional(),
        userId: z.string().optional(),
        conversationProviderId: z.string().optional(),
        chatWidgetId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        activity: z.object({}).passthrough().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single message by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations/message.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/conversations/messages/${encodeURIComponent(input.id)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerMessage = providerResponse.message;

        return {
            id: providerMessage.id,
            ...(providerMessage.type !== undefined && { type: providerMessage.type }),
            ...(providerMessage.messageType !== undefined && { messageType: providerMessage.messageType }),
            ...(providerMessage.locationId !== undefined && { locationId: providerMessage.locationId }),
            ...(providerMessage.contactId !== undefined && { contactId: providerMessage.contactId }),
            ...(providerMessage.conversationId !== undefined && { conversationId: providerMessage.conversationId }),
            ...(providerMessage.dateAdded !== undefined && { dateAdded: providerMessage.dateAdded }),
            ...(providerMessage.dateUpdated !== undefined && { dateUpdated: providerMessage.dateUpdated }),
            ...(providerMessage.body !== undefined && { body: providerMessage.body }),
            ...(providerMessage.direction !== undefined && { direction: providerMessage.direction }),
            ...(providerMessage.status !== undefined && { status: providerMessage.status }),
            ...(providerMessage.contentType !== undefined && { contentType: providerMessage.contentType }),
            ...(providerMessage.attachments !== undefined && { attachments: providerMessage.attachments }),
            ...(providerMessage.meta !== undefined && { meta: providerMessage.meta }),
            ...(providerMessage.source !== undefined && { source: providerMessage.source }),
            ...(providerMessage.userId !== undefined && { userId: providerMessage.userId }),
            ...(providerMessage.conversationProviderId !== undefined && { conversationProviderId: providerMessage.conversationProviderId }),
            ...(providerMessage.chatWidgetId !== undefined && { chatWidgetId: providerMessage.chatWidgetId }),
            ...(providerMessage.from !== undefined && { from: providerMessage.from }),
            ...(providerMessage.to !== undefined && { to: providerMessage.to }),
            ...(providerMessage.activity !== undefined && { activity: providerMessage.activity })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
