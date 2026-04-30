import { createSync } from 'nango';
import { z } from 'zod';

const _MetadataSchema = z.object({
    data_source_id: z.string()
});

const ProviderTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    is_default: z.boolean()
});

const ListDataSourceTemplatesResponseSchema = z.object({
    templates: z.array(ProviderTemplateSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const DataSourceTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    data_source_id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    start_cursor: z.string()
});

const sync = createSync({
    description: 'Sync templates available for a Notion data source',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DataSourceTemplate: DataSourceTemplateSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/data-source-templates'
        }
    ],
    scopes: [],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof _MetadataSchema>>();
        const dataSourceId = metadata?.data_source_id;

        if (!dataSourceId) {
            throw new Error('data_source_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;

        // Blocker: The Notion data source templates endpoint does not support
        // incremental filtering, so this stays a full refresh sync and uses
        // the cursor only to resume interrupted runs safely.
        await nango.trackDeletesStart('DataSourceTemplate');
        let cursor = parsedCheckpoint?.success ? parsedCheckpoint.data.start_cursor : undefined;

        do {
            const response = await nango.get({
                // https://developers.notion.com/reference/list-data-source-templates
                endpoint: `/v1/data_sources/${encodeURIComponent(dataSourceId)}/templates`,
                headers: {
                    'Notion-Version': '2026-03-11'
                },
                params: {
                    page_size: 100,
                    ...(cursor && { start_cursor: cursor })
                },
                retries: 3
            });

            const parsedResponse = ListDataSourceTemplatesResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse data source templates response: ${parsedResponse.error.message}`);
            }

            const templates = parsedResponse.data.templates.map((record) => ({
                id: record.id,
                name: record.name,
                data_source_id: dataSourceId
            }));

            if (templates.length > 0) {
                await nango.batchSave(templates, 'DataSourceTemplate');
            }

            const nextCursor = parsedResponse.data.next_cursor ?? undefined;
            if (nextCursor) {
                await nango.saveCheckpoint({ start_cursor: nextCursor });
            }

            cursor = nextCursor;
        } while (cursor);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DataSourceTemplate');
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
