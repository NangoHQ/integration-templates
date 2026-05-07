import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations
const ConversationSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    state: z.enum(['open', 'closed', 'snoozed']).optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    waiting_since: z.number().nullable().optional(),
    snoozed_until: z.number().nullable().optional(),
    open: z.boolean().optional(),
    read: z.boolean().optional(),
    priority: z.string().optional(),
    admin_assignee_id: z.number().nullable().optional(),
    team_assignee_id: z.number().nullable().optional(),
    tags: z
        .object({
            tags: z.array(z.object({ id: z.string(), name: z.string() }).passthrough())
        })
        .passthrough()
        .nullable()
        .optional(),
    source: z.object({}).passthrough().nullable().optional(),
    contacts: z.object({}).passthrough().nullable().optional(),
    company: z.object({}).passthrough().nullable().optional(),
    teammates: z.object({}).passthrough().nullable().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    conversation_rating: z.object({}).passthrough().nullable().optional(),
    first_contact_reply: z.object({}).passthrough().nullable().optional(),
    sla_applied: z.object({}).passthrough().nullable().optional(),
    statistics: z.object({}).passthrough().nullable().optional(),
    linked_objects: z.object({}).passthrough().nullable().optional(),
    ai_agent_participated: z.boolean().optional(),
    ai_agent: z.object({}).passthrough().nullable().optional()
});

const ConversationListItemSchema = z.object({
    id: z.string(),
    updated_at: z.number()
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync conversations from Intercom',
    version: '3.0.0',
    endpoints: [{ path: '/syncs/conversations', method: 'POST' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Conversation: ConversationSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(checkpoint);

        // Bound lookback window on first run (2 years back).
        const defaultLookback = Math.floor(Date.now() / 1000) - 2 * 365 * 24 * 60 * 60;
        const updatedAfter = checkpointParsed.success ? checkpointParsed.data.updated_after : defaultLookback;

        // cursor_name_in_request uses dot-path so lodash set() writes the cursor into
        // body.pagination.starting_after, not at the top-level body key.
        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/searchConversations
            endpoint: '/conversations/search',
            method: 'POST',
            data: {
                query: {
                    operator: 'AND',
                    value: [{ field: 'updated_at', operator: '>', value: updatedAfter }]
                },
                pagination: { per_page: 100 }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination.starting_after',
                cursor_path_in_response: 'pages.next.starting_after',
                response_path: 'conversations',
                limit_name_in_request: 'per_page',
                limit: 60
            },
            headers: { 'Intercom-Version': '2.11' },
            retries: 3
        };

        let maxUpdatedAt: number | undefined;
        let sawConversations = false;

        for await (const batch of nango.paginate<z.infer<typeof ConversationListItemSchema>>(proxyConfig)) {
            sawConversations = sawConversations || batch.length > 0;
            const toSave: z.infer<typeof ConversationSchema>[] = [];

            for (const item of batch) {
                const parsed = ConversationListItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse conversation list item: ${parsed.error.message}`);
                }

                // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/retrieveConversation
                const detail = await nango.get({
                    endpoint: `/conversations/${encodeURIComponent(parsed.data.id)}`,
                    params: { display_as: 'plaintext' },
                    headers: { 'Intercom-Version': '2.11' },
                    retries: 3
                });

                const c = detail.data;
                toSave.push({
                    id: c.id,
                    ...(c.title != null && { title: c.title }),
                    ...(c.state !== undefined && { state: c.state }),
                    ...(c.created_at !== undefined && { created_at: c.created_at }),
                    ...(c.updated_at !== undefined && { updated_at: c.updated_at }),
                    ...(c.waiting_since != null && { waiting_since: c.waiting_since }),
                    ...(c.snoozed_until != null && { snoozed_until: c.snoozed_until }),
                    ...(c.open !== undefined && { open: c.open }),
                    ...(c.read !== undefined && { read: c.read }),
                    ...(c.priority !== undefined && { priority: c.priority }),
                    ...(c.admin_assignee_id != null && { admin_assignee_id: c.admin_assignee_id }),
                    ...(c.team_assignee_id != null && { team_assignee_id: c.team_assignee_id }),
                    ...(c.tags !== undefined && { tags: c.tags ?? null }),
                    ...(c.source !== undefined && { source: c.source ?? null }),
                    ...(c.contacts !== undefined && { contacts: c.contacts ?? null }),
                    ...(c.company !== undefined && { company: c.company ?? null }),
                    ...(c.teammates !== undefined && { teammates: c.teammates ?? null }),
                    ...(c.custom_attributes !== undefined && { custom_attributes: c.custom_attributes }),
                    ...(c.conversation_rating !== undefined && { conversation_rating: c.conversation_rating ?? null }),
                    ...(c.first_contact_reply !== undefined && { first_contact_reply: c.first_contact_reply ?? null }),
                    ...(c.sla_applied !== undefined && { sla_applied: c.sla_applied ?? null }),
                    ...(c.statistics !== undefined && { statistics: c.statistics ?? null }),
                    ...(c.linked_objects !== undefined && { linked_objects: c.linked_objects ?? null }),
                    ...(c.ai_agent_participated !== undefined && { ai_agent_participated: c.ai_agent_participated }),
                    ...(c.ai_agent !== undefined && { ai_agent: c.ai_agent ?? null })
                });

                if (maxUpdatedAt === undefined || parsed.data.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = parsed.data.updated_at;
                }
            }

            if (toSave.length > 0) {
                await nango.batchSave(toSave, 'Conversation');
            }
        }

        if (sawConversations && maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
