import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCreatorSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ProviderReplySchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    text_body: z.string().optional(),
    created_at: z.string().optional(),
    creator_id: z.string().optional(),
    creator: ProviderCreatorSchema.optional()
});

const ProviderUpdateSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    text_body: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    edited_at: z.string().optional(),
    creator_id: z.string().optional(),
    creator: ProviderCreatorSchema.optional(),
    item_id: z.string().optional(),
    item: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    replies: z.array(ProviderReplySchema).optional()
});

const UpdateSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    text_body: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    edited_at: z.string().optional(),
    creator_id: z.string().optional(),
    creator_name: z.string().optional(),
    item_id: z.string().optional(),
    item_name: z.string().optional(),
    replies: z
        .array(
            z.object({
                id: z.string(),
                body: z.string().optional(),
                text_body: z.string().optional(),
                created_at: z.string().optional(),
                creator_id: z.string().optional(),
                creator_name: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync updates from monday.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/updates'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Update: UpdateSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = validatedCheckpoint.success ? validatedCheckpoint.data.updated_after : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/updates
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04',
                'Content-Type': 'application/json'
            },
            data: {
                query: `
                    query ($page: Int, $limit: Int) {
                        updates(page: $page, limit: $limit) {
                            id
                            body
                            text_body
                            created_at
                            updated_at
                            edited_at
                            creator_id
                            creator {
                                id
                                name
                            }
                            item_id
                            item {
                                id
                                name
                            }
                            replies {
                                id
                                body
                                text_body
                                created_at
                                creator_id
                                creator {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `,
                variables: {
                    page: 1,
                    limit: 100
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.updates'
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected updates to be an array');
            }

            const filtered: z.infer<typeof ProviderUpdateSchema>[] = [];

            for (const raw of page) {
                const result = ProviderUpdateSchema.safeParse(raw);
                if (!result.success) {
                    throw new Error(`Failed to parse update: ${result.error.message}`);
                }
                const update = result.data;
                if (updatedAfter && update.updated_at && update.updated_at <= updatedAfter) {
                    continue;
                }
                filtered.push(update);
                if (update.updated_at && (maxUpdatedAt === undefined || update.updated_at > maxUpdatedAt)) {
                    maxUpdatedAt = update.updated_at;
                }
            }

            if (filtered.length === 0) {
                continue;
            }

            const records = filtered.map((update) => ({
                id: update.id,
                ...(update.body != null && { body: update.body }),
                ...(update.text_body != null && { text_body: update.text_body }),
                ...(update.created_at != null && { created_at: update.created_at }),
                ...(update.updated_at != null && { updated_at: update.updated_at }),
                ...(update.edited_at != null && { edited_at: update.edited_at }),
                ...(update.creator_id != null && { creator_id: update.creator_id }),
                ...(update.creator?.name != null && { creator_name: update.creator.name }),
                ...(update.item_id != null && { item_id: update.item_id }),
                ...(update.item?.name != null && { item_name: update.item.name }),
                replies: update.replies?.length
                    ? update.replies.map((reply) => ({
                          id: reply.id,
                          ...(reply.body != null && { body: reply.body }),
                          ...(reply.text_body != null && { text_body: reply.text_body }),
                          ...(reply.created_at != null && { created_at: reply.created_at }),
                          ...(reply.creator_id != null && { creator_id: reply.creator_id }),
                          ...(reply.creator?.name != null && { creator_name: reply.creator.name })
                      }))
                    : undefined
            }));

            await nango.batchSave(records, 'Update');
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
