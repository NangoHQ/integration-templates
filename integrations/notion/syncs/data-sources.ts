import { createSync } from 'nango';
import { z } from 'zod';

// Provider response schemas
const RichTextItemSchema = z.object({
    type: z.string(),
    plain_text: z.string().optional()
});

const DataSourceParentSchema = z.union([
    z.object({
        type: z.literal('database_id'),
        database_id: z.string()
    }),
    z.object({
        type: z.literal('data_source_id'),
        data_source_id: z.string(),
        database_id: z.string()
    })
]);

const DatabaseParentSchema = z.union([
    z.object({
        type: z.literal('page_id'),
        page_id: z.string()
    }),
    z.object({
        type: z.literal('workspace'),
        workspace: z.literal(true)
    }),
    z.object({
        type: z.literal('database_id'),
        database_id: z.string()
    }),
    z.object({
        type: z.literal('block_id'),
        block_id: z.string()
    })
]);

const PartialUserSchema = z.object({
    id: z.string(),
    object: z.literal('user')
});

const DataSourcePropertiesSchema = z.record(z.string(), z.unknown());

const DataSourceObjectSchema = z.object({
    object: z.literal('data_source'),
    id: z.string(),
    title: z.array(RichTextItemSchema).optional(),
    description: z.array(RichTextItemSchema).optional(),
    parent: DataSourceParentSchema.optional(),
    database_parent: DatabaseParentSchema.optional(),
    is_inline: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional(),
    created_by: PartialUserSchema.optional(),
    last_edited_by: PartialUserSchema.optional(),
    properties: DataSourcePropertiesSchema.optional(),
    url: z.string().optional(),
    public_url: z.string().nullable().optional()
});

// Normalized model schema
const DataSourceSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    parent_database_id: z.string().optional(),
    parent_data_source_id: z.string().optional(),
    is_inline: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional(),
    created_by_id: z.string().optional(),
    last_edited_by_id: z.string().optional(),
    url: z.string().optional(),
    public_url: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional()
});

const SearchResponseSchema = z.object({
    object: z.literal('list'),
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable(),
    has_more: z.boolean()
});

const CheckpointSchema = z.object({
    start_cursor: z.string()
});

const sync = createSync({
    description: 'Sync Notion data source definitions and schema metadata.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DataSource: DataSourceSchema
    },
    endpoints: [
        {
            path: '/syncs/data-sources',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;

        // Blocker: The Notion search API does not support filtering by
        // last_edited_time or other change timestamps. It returns all
        // data sources in the workspace without a way to fetch only
        // changed records since a specific time. Therefore, this remains
        // a full refresh sync and uses the search cursor only to resume
        // interrupted runs safely.
        await nango.trackDeletesStart('DataSource');
        let cursor = parsedCheckpoint?.success ? parsedCheckpoint.data.start_cursor : undefined;
        let checkpointSaved = false;
        const hadExistingCheckpoint = !!cursor;

        // https://developers.notion.com/reference/post-search
        // Search for all data sources shared with the connection
        do {
            const response = await nango.post({
                endpoint: '/v1/search',
                data: {
                    filter: {
                        property: 'object',
                        value: 'data_source'
                    },
                    sort: {
                        timestamp: 'last_edited_time',
                        direction: 'ascending'
                    },
                    page_size: 100,
                    ...(cursor && { start_cursor: cursor })
                },
                retries: 3
            });

            const parsedResponse = SearchResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse search results: ${parsedResponse.error.message}`);
            }

            const dataSources: z.infer<typeof DataSourceSchema>[] = [];

            for (const item of parsedResponse.data.results) {
                const objectType = z.object({ object: z.string() }).safeParse(item);
                if (!objectType.success || objectType.data.object !== 'data_source') {
                    continue;
                }

                const dataSourceParse = DataSourceObjectSchema.safeParse(item);
                if (!dataSourceParse.success) {
                    throw new Error(`Failed to parse data source: ${dataSourceParse.error.message}`);
                }
                const dataSource = dataSourceParse.data;

                // Extract plain text from rich text title
                const title = dataSource.title ? dataSource.title.map((t) => t.plain_text ?? '').join('') : undefined;

                // Extract plain text from rich text description
                const description = dataSource.description ? dataSource.description.map((t) => t.plain_text ?? '').join('') : undefined;

                // Extract parent IDs
                let parentDatabaseId: string | undefined;
                let parentDataSourceId: string | undefined;

                if (dataSource.parent) {
                    if (dataSource.parent.type === 'database_id') {
                        parentDatabaseId = dataSource.parent.database_id;
                    } else if (dataSource.parent.type === 'data_source_id') {
                        parentDataSourceId = dataSource.parent.data_source_id;
                        parentDatabaseId = dataSource.parent.database_id;
                    }
                }

                dataSources.push({
                    id: dataSource.id,
                    ...(title && { title }),
                    ...(description && { description }),
                    ...(parentDatabaseId && { parent_database_id: parentDatabaseId }),
                    ...(parentDataSourceId && { parent_data_source_id: parentDataSourceId }),
                    ...(dataSource.is_inline !== undefined && {
                        is_inline: dataSource.is_inline
                    }),
                    ...(dataSource.in_trash !== undefined && {
                        in_trash: dataSource.in_trash
                    }),
                    ...(dataSource.created_time && { created_time: dataSource.created_time }),
                    ...(dataSource.last_edited_time && {
                        last_edited_time: dataSource.last_edited_time
                    }),
                    ...(dataSource.created_by?.id && { created_by_id: dataSource.created_by.id }),
                    ...(dataSource.last_edited_by?.id && {
                        last_edited_by_id: dataSource.last_edited_by.id
                    }),
                    ...(dataSource.url && { url: dataSource.url }),
                    ...(dataSource.public_url && { public_url: dataSource.public_url }),
                    ...(dataSource.properties && { properties: dataSource.properties })
                });
            }

            if (dataSources.length > 0) {
                await nango.batchSave(dataSources, 'DataSource');
            }

            const nextCursor = parsedResponse.data.next_cursor ?? undefined;
            if (nextCursor) {
                await nango.saveCheckpoint({ start_cursor: nextCursor });
                checkpointSaved = true;
            }

            cursor = nextCursor;
        } while (cursor);

        if (checkpointSaved || hadExistingCheckpoint) {
            await nango.clearCheckpoint();
        }
        await nango.trackDeletesEnd('DataSource');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
