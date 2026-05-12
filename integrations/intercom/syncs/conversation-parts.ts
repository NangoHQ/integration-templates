import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/retrieveConversation
const ConversationPartSchema = z.object({
    id: z.string(),
    conversation_id: z.string(),
    part_type: z.string().optional(),
    body: z.string().nullable().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    author: z.object({}).passthrough().optional()
});

const ConversationListItemSchema = z.object({
    id: z.string(),
    updated_at: z.number()
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync conversation messages (parts) from Intercom',
    version: '1.0.0',
    endpoints: [{ path: '/syncs/conversation-parts', method: 'POST' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ConversationPart: ConversationPartSchema
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
            const toSave: z.infer<typeof ConversationPartSchema>[] = [];

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

                const parts: any[] = detail.data?.conversation_parts?.conversation_parts ?? [];
                for (const part of parts) {
                    if (!part.id) continue;
                    toSave.push({
                        id: part.id,
                        conversation_id: parsed.data.id,
                        ...(part.part_type !== undefined && { part_type: part.part_type }),
                        ...(part.body != null && { body: part.body }),
                        ...(part.created_at !== undefined && { created_at: part.created_at }),
                        ...(part.updated_at !== undefined && { updated_at: part.updated_at }),
                        ...(part.author !== undefined && { author: part.author })
                    });
                }

                if (maxUpdatedAt === undefined || parsed.data.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = parsed.data.updated_at;
                }
            }

            if (toSave.length > 0) {
                await nango.batchSave(toSave, 'ConversationPart');
            }
        }

        if (sawConversations && maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
