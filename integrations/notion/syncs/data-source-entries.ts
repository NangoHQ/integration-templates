import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.notion.com/reference/query-a-data-source
const NotionPageSchema = z.object({
    object: z.literal('page'),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    in_trash: z.boolean(),
    is_archived: z.boolean().optional(),
    is_locked: z.boolean().optional(),
    url: z.string(),
    public_url: z.string().nullable().optional(),
    parent: z.record(z.string(), z.unknown()).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    icon: z.unknown().optional(),
    cover: z.unknown().optional(),
    created_by: z.object({ id: z.string(), object: z.literal('user') }).optional(),
    last_edited_by: z.object({ id: z.string(), object: z.literal('user') }).optional()
});

const MetadataSchema = z.object({
    data_source_id: z.union([z.string(), z.array(z.string())])
});

const QueryDataSourceResponseSchema = z.object({
    object: z.literal('list'),
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable(),
    has_more: z.boolean()
});

const DataSourceEntrySchema = z.object({
    id: z.string(),
    data_source_id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    url: z.string(),
    public_url: z.string().optional(),
    in_trash: z.boolean(),
    is_archived: z.boolean().optional(),
    is_locked: z.boolean().optional(),
    properties: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    data_source_checkpoints_json: z.string(),
    active_data_source_id: z.string(),
    active_updated_after: z.string(),
    active_start_cursor: z.string()
});

const LegacyCheckpointSchema = z.object({
    updated_after: z.string()
});

function parseDataSourceCheckpoints(value: string): Record<string, string> {
    try {
        const parsed = JSON.parse(value);
        const parsedRecord = z.record(z.string(), z.string()).safeParse(parsed);
        return parsedRecord.success ? parsedRecord.data : {};
    } catch {
        return {};
    }
}

function serializeCheckpoint(
    dataSourceCheckpoints: Record<string, string>,
    active?: {
        dataSourceId?: string | undefined;
        updatedAfter?: string | undefined;
        startCursor?: string | undefined;
    }
) {
    return {
        data_source_checkpoints_json: JSON.stringify(dataSourceCheckpoints),
        active_data_source_id: active?.dataSourceId ?? '',
        active_updated_after: active?.updatedAfter ?? '',
        active_start_cursor: active?.startCursor ?? ''
    };
}

const sync = createSync({
    description: 'Sync page entries from a Notion data source with properties and timestamps',
    version: '1.1.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    endpoints: [{ path: '/syncs/data-source-entries', method: 'POST' }],
    checkpoint: CheckpointSchema,
    models: {
        DataSourceEntry: DataSourceEntrySchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Metadata must include data_source_id: string or array of strings');
        }

        const dataSourceIds = Array.isArray(parsedMetadata.data.data_source_id) ? parsedMetadata.data.data_source_id : [parsedMetadata.data.data_source_id];

        if (dataSourceIds.length === 0) {
            throw new Error('At least one data_source_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const parsedLegacyCheckpoint = rawCheckpoint ? LegacyCheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpointData = parsedCheckpoint?.success ? parsedCheckpoint.data : undefined;
        const dataSourceCheckpoints = checkpointData
            ? parseDataSourceCheckpoints(checkpointData.data_source_checkpoints_json)
            : parsedLegacyCheckpoint?.success
              ? Object.fromEntries(dataSourceIds.map((dataSourceId) => [dataSourceId, parsedLegacyCheckpoint.data.updated_after]))
              : {};

        for (const dataSourceId of dataSourceIds) {
            const isResumingDataSource = checkpointData?.active_data_source_id === dataSourceId;
            const updatedAfter = isResumingDataSource ? checkpointData?.active_updated_after || undefined : dataSourceCheckpoints[dataSourceId];
            let cursor = isResumingDataSource ? checkpointData?.active_start_cursor || undefined : undefined;
            let lastProcessedTimestamp: string | undefined;

            do {
                const response = await nango.post({
                    // https://developers.notion.com/reference/query-a-data-source
                    endpoint: `/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`,
                    headers: { 'Notion-Version': '2026-03-11' },
                    data: {
                        page_size: 100,
                        sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
                        ...(updatedAfter && {
                            filter: {
                                timestamp: 'last_edited_time',
                                last_edited_time: { after: updatedAfter }
                            }
                        }),
                        ...(cursor && { start_cursor: cursor })
                    },
                    retries: 3
                });

                const parsedResponse = QueryDataSourceResponseSchema.safeParse(response.data);
                if (!parsedResponse.success) {
                    throw new Error(`Failed to parse data source query response: ${parsedResponse.error.message}`);
                }

                const pages = parsedResponse.data.results.flatMap((item) => {
                    const parsed = NotionPageSchema.safeParse(item);
                    return parsed.success ? [parsed.data] : [];
                });

                if (pages.length === 0) {
                    const nextCursor = parsedResponse.data.next_cursor ?? undefined;
                    if (nextCursor) {
                        await nango.saveCheckpoint(
                            serializeCheckpoint(
                                { ...dataSourceCheckpoints },
                                {
                                    dataSourceId,
                                    updatedAfter,
                                    startCursor: nextCursor
                                }
                            )
                        );
                    } else if (isResumingDataSource) {
                        await nango.saveCheckpoint(serializeCheckpoint({ ...dataSourceCheckpoints }));
                    }

                    cursor = nextCursor;
                    continue;
                }

                const entries = pages.map((page) => ({
                    id: page.id,
                    data_source_id: dataSourceId,
                    created_time: page.created_time,
                    last_edited_time: page.last_edited_time,
                    url: page.url,
                    ...(page.public_url != null && { public_url: page.public_url }),
                    in_trash: page.in_trash,
                    ...(page.is_archived != null && { is_archived: page.is_archived }),
                    ...(page.is_locked != null && { is_locked: page.is_locked }),
                    ...(page.properties != null && { properties: page.properties })
                }));

                await nango.batchSave(entries, 'DataSourceEntry');

                const lastPage = pages[pages.length - 1];
                if (lastPage) {
                    lastProcessedTimestamp = lastPage.last_edited_time;
                }

                const nextCursor = parsedResponse.data.next_cursor ?? undefined;
                if (nextCursor) {
                    await nango.saveCheckpoint(
                        serializeCheckpoint(
                            { ...dataSourceCheckpoints },
                            {
                                dataSourceId,
                                updatedAfter,
                                startCursor: nextCursor
                            }
                        )
                    );
                } else if (lastProcessedTimestamp) {
                    dataSourceCheckpoints[dataSourceId] = lastProcessedTimestamp;
                    await nango.saveCheckpoint(serializeCheckpoint({ ...dataSourceCheckpoints }));
                }

                cursor = nextCursor;
            } while (cursor);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
