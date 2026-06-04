import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ShopifyEventNodeSchema = z.object({
    id: z.string(),
    action: z.string(),
    createdAt: z.string(),
    message: z.string(),
    appTitle: z.string().optional().nullable(),
    attributeToApp: z.boolean(),
    attributeToUser: z.boolean(),
    criticalAlert: z.boolean(),
    arguments: z.unknown().optional().nullable(),
    subjectId: z.string().optional(),
    subjectType: z.string().optional(),
    additionalContent: z.unknown().optional().nullable()
});

const EventSchema = z.object({
    id: z.string(),
    action: z.string(),
    createdAt: z.string(),
    message: z.string(),
    appTitle: z.string().optional(),
    attributeToApp: z.boolean().optional(),
    attributeToUser: z.boolean().optional(),
    criticalAlert: z.boolean().optional(),
    arguments: z.string().optional(),
    subjectId: z.string().optional(),
    subjectType: z.string().optional(),
    additionalContent: z.string().optional()
});

const CheckpointSchema = z.object({
    created_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify store events for audit and activity feed use cases.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },
    endpoints: [
        {
            path: '/syncs/events',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { created_after: '', cursor: '' });
        const createdAfter = checkpoint.created_after || undefined;
        let cursor = checkpoint.cursor || undefined;
        const queryFilter = createdAfter ? `created_at:>=${createdAfter}` : undefined;
        let maxCreatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/events
            endpoint: '/admin/api/2025-04/graphql.json',
            method: 'POST',
            data: {
                query: 'query Events($query: String, $first: Int!, $after: String) { events(query: $query, first: $first, after: $after, sortKey: CREATED_AT, reverse: false) { nodes { id action createdAt message appTitle attributeToApp attributeToUser criticalAlert ... on BasicEvent { arguments subjectId subjectType additionalContent } } pageInfo { hasNextPage endCursor } } }',
                variables: {
                    ...(queryFilter && { query: queryFilter }),
                    first: 100,
                    ...(cursor && { after: cursor })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.events.pageInfo.endCursor',
                response_path: 'data.events.nodes',
                limit_name_in_request: 'variables.first',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const events = [];
            for (const record of page) {
                const parsedRecord = ShopifyEventNodeSchema.safeParse(record);
                if (!parsedRecord.success) {
                    throw new Error(`Failed to parse event record: ${parsedRecord.error.message}`);
                }

                const event = parsedRecord.data;
                if (maxCreatedAt === undefined || event.createdAt > maxCreatedAt) {
                    maxCreatedAt = event.createdAt;
                }

                events.push({
                    id: event.id,
                    action: event.action,
                    createdAt: event.createdAt,
                    message: event.message,
                    ...(event.appTitle != null && { appTitle: event.appTitle }),
                    ...(event.attributeToApp != null && { attributeToApp: event.attributeToApp }),
                    ...(event.attributeToUser != null && { attributeToUser: event.attributeToUser }),
                    ...(event.criticalAlert != null && { criticalAlert: event.criticalAlert }),
                    ...(event.arguments != null && { arguments: JSON.stringify(event.arguments) }),
                    ...(event.subjectId != null && { subjectId: event.subjectId }),
                    ...(event.subjectType != null && { subjectType: event.subjectType }),
                    ...(event.additionalContent != null && event.additionalContent !== 'null' && { additionalContent: String(event.additionalContent) })
                });
            }

            if (events.length === 0) {
                continue;
            }

            await nango.batchSave(events, 'Event');

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    created_after: createdAfter || '',
                    cursor
                });
            }
        }

        if (maxCreatedAt !== undefined) {
            await nango.saveCheckpoint({
                created_after: maxCreatedAt,
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
