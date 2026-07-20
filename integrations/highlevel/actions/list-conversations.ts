import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.union([z.string(), z.number()]).optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    contactId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: z.enum(['all', 'read', 'unread', 'starred', 'recents']).optional(),
    query: z.string().optional(),
    limit: z.number().optional(),
    sort: z.enum(['asc', 'desc']).optional(),
    sortBy: z.enum(['last_manual_message_date', 'last_message_date', 'score_profile', 'overdue_at', 'due_at']).optional(),
    lastMessageType: z.string().optional(),
    lastMessageAction: z.enum(['automated', 'manual']).optional(),
    lastMessageDirection: z.enum(['inbound', 'outbound']).optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional()
});

const ProviderConversationSchema = z
    .object({
        id: z.string(),
        contactId: z.string(),
        locationId: z.string(),
        lastMessageBody: z.string().nullish(),
        lastMessageType: z.string().nullish(),
        type: z.string().nullish(),
        unreadCount: z.number().nullish(),
        fullName: z.string().nullish(),
        contactName: z.string().nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish(),
        assignedTo: z.string().nullish(),
        lastMessageDate: z.union([z.number(), z.string()]).nullish(),
        dateAdded: z.union([z.number(), z.string()]).nullish(),
        dateUpdated: z.union([z.number(), z.string()]).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderConversationSchema),
    total: z.number(),
    nextCursor: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'List conversations from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawConfig = connection.connection_config;
        const rawLocationIdFromConfig = rawConfig ? rawConfig['locationId'] : undefined;
        const locationIdFromConfig = typeof rawLocationIdFromConfig === 'string' ? rawLocationIdFromConfig : undefined;

        let locationId = locationIdFromConfig;
        if (!locationId) {
            const metadata = await nango.getMetadata();
            const rawLocationIdFromMeta = metadata['locationId'];
            locationId = typeof rawLocationIdFromMeta === 'string' ? rawLocationIdFromMeta : undefined;
        }

        if (!locationId) {
            throw new nango.ActionError({
                type: 'missing_location_id',
                message: 'Location ID is missing from the connection configuration and metadata.'
            });
        }

        // https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation
        const response = await nango.get({
            endpoint: '/conversations/search',
            params: {
                locationId,
                ...(input.cursor !== undefined && { startAfterDate: input.cursor }),
                ...(input.contactId && { contactId: input.contactId }),
                ...(input.assignedTo && { assignedTo: input.assignedTo }),
                ...(input.status && { status: input.status }),
                ...(input.query && { query: input.query }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.sort && { sort: input.sort }),
                ...(input.sortBy && { sortBy: input.sortBy }),
                ...(input.lastMessageType && { lastMessageType: input.lastMessageType }),
                ...(input.lastMessageAction && { lastMessageAction: input.lastMessageAction }),
                ...(input.lastMessageDirection && { lastMessageDirection: input.lastMessageDirection }),
                ...(input.startDate !== undefined && { startDate: input.startDate }),
                ...(input.endDate !== undefined && { endDate: input.endDate })
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                conversations: z.array(z.unknown()),
                total: z.number()
            })
            .parse(response.data);

        const items = providerResponse.conversations.map((item) => {
            const parsed = ProviderConversationSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned an unexpected conversation shape.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const lastItem = items[items.length - 1];
        const nextCursor =
            (lastItem != null && lastItem.lastMessageDate != null ? lastItem.lastMessageDate : undefined) ||
            (lastItem != null && lastItem.dateUpdated != null ? lastItem.dateUpdated : undefined) ||
            (lastItem != null && lastItem.dateAdded != null ? lastItem.dateAdded : undefined);

        return {
            items,
            total: providerResponse.total,
            ...(nextCursor && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
