import { createSync } from 'nango';
import { z } from 'zod';

const MetaobjectFieldNodeSchema = z.object({
    key: z.string(),
    value: z.string().nullable().optional(),
    jsonValue: z.unknown().optional()
});

const MetaobjectNodeSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string(),
    updatedAt: z.string(),
    createdAt: z.string(),
    fields: z.array(MetaobjectFieldNodeSchema).optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const MetaobjectsResponseSchema = z.object({
    data: z
        .object({
            metaobjects: z.object({
                nodes: z.array(MetaobjectNodeSchema),
                pageInfo: PageInfoSchema
            })
        })
        .nullable()
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const MetadataSchema = z.object({
    types: z.array(z.string()).min(1)
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    typeIndex: z.number().int(),
    cursor: z.string()
});

const MetaobjectSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string(),
    updatedAt: z.string(),
    createdAt: z.string(),
    fields: z
        .array(
            z.object({
                key: z.string(),
                value: z.string().optional(),
                jsonValue: z.unknown().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync Shopify metaobjects for one or more metaobject types.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Metaobject: MetaobjectSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/metaobjects'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.types || metadata.types.length === 0) {
            throw new Error('At least one metaobject type is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const types = metadata.types;
        const startTypeIndex = checkpoint?.typeIndex ?? 0;
        const startCursor = checkpoint?.cursor || undefined;
        const runStartTime = new Date().toISOString();

        for (let i = startTypeIndex; i < types.length; i++) {
            const type = types[i];
            const updatedAfter = checkpoint?.updatedAfter || undefined;
            const query = updatedAfter ? `updated_at:>${updatedAfter}` : undefined;
            let hasNextPage = true;
            let cursor: string | undefined = i === startTypeIndex ? startCursor : undefined;

            while (hasNextPage) {
                // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/metaobjects
                const response = await nango.post({
                    endpoint: '/admin/api/2026-04/graphql.json',
                    data: {
                        query: `query Metaobjects($type: String!, $first: Int!, $after: String, $query: String) {
                            metaobjects(type: $type, first: $first, after: $after, query: $query, sortKey: "updated_at") {
                                nodes {
                                    id
                                    handle
                                    type
                                    displayName
                                    updatedAt
                                    createdAt
                                    fields {
                                        key
                                        value
                                        jsonValue
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }`,
                        variables: {
                            type,
                            first: 50,
                            ...(cursor && { after: cursor }),
                            ...(query && { query })
                        }
                    },
                    retries: 3
                });

                const parsed = MetaobjectsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse metaobjects response: ${parsed.error.message}`);
                }

                if (parsed.data.errors && parsed.data.errors.length > 0) {
                    throw new Error(`GraphQL errors: ${JSON.stringify(parsed.data.errors)}`);
                }

                const metaobjectsData = parsed.data.data?.metaobjects;
                if (!metaobjectsData) {
                    throw new Error('Missing metaobjects data in response');
                }

                const nodes = metaobjectsData.nodes;
                hasNextPage = metaobjectsData.pageInfo.hasNextPage;
                cursor = metaobjectsData.pageInfo.endCursor ?? undefined;

                const records = nodes.map((metaobject) => ({
                    id: metaobject.id,
                    handle: metaobject.handle,
                    type: metaobject.type,
                    displayName: metaobject.displayName,
                    updatedAt: metaobject.updatedAt,
                    createdAt: metaobject.createdAt,
                    fields:
                        metaobject.fields?.map((field) => ({
                            key: field.key,
                            ...(field.value != null && { value: field.value }),
                            ...(field.jsonValue != null && { jsonValue: field.jsonValue })
                        })) ?? []
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Metaobject');
                }

                await nango.saveCheckpoint({
                    updatedAfter: checkpoint?.updatedAfter ?? '',
                    typeIndex: i,
                    cursor: cursor ?? ''
                });
            }

            await nango.saveCheckpoint({
                updatedAfter: checkpoint?.updatedAfter ?? '',
                typeIndex: i + 1,
                cursor: ''
            });
        }

        await nango.saveCheckpoint({
            updatedAfter: runStartTime,
            typeIndex: 0,
            cursor: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
