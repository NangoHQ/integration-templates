import { createSync } from 'nango';
import { z } from 'zod';

/**
 * Sync Content Metadata
 * Sync page and data source metadata for broad Notion content discovery.
 *
 * Uses the Notion Search API to discover pages and data sources,
 * then retrieves detailed metadata for each item.
 */

// Raw provider response schemas
const TitleAnnotationSchema = z.object({
    type: z.string(),
    text: z.object({
        content: z.string()
    })
});

const PageObjectSchema = z.object({
    object: z.literal('page'),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    created_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    last_edited_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    cover: z.unknown().optional(),
    icon: z.unknown().optional(),
    parent: z
        .object({
            type: z.string(),
            page_id: z.string().optional(),
            database_id: z.string().optional(),
            workspace_id: z.string().optional(),
            block_id: z.string().optional()
        })
        .optional(),
    archived: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    properties: z
        .object({
            title: z
                .object({
                    title: z.array(TitleAnnotationSchema)
                })
                .optional()
        })
        .optional(),
    url: z.string().optional(),
    public_url: z.string().nullable().optional()
});

const DataSourceObjectSchema = z.object({
    object: z.literal('data_source'),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    created_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    last_edited_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    title: z.array(TitleAnnotationSchema).optional(),
    description: z.array(z.unknown()).optional(),
    parent: z
        .object({
            type: z.string(),
            database_id: z.string()
        })
        .optional(),
    properties: z.unknown().optional(),
    url: z.string().optional(),
    public_url: z.string().nullable().optional()
});

// Union type for search results
const SearchResultItemSchema = z.union([PageObjectSchema, DataSourceObjectSchema]);

// Normalized model schema
const ContentMetadataSchema = z.object({
    id: z.string(),
    object_type: z.enum(['page', 'data_source']),
    title: z.string().optional(),
    created_time: z.string(),
    last_edited_time: z.string(),
    parent_id: z.string().optional(),
    parent_type: z.string().optional(),
    url: z.string().optional(),
    archived: z.boolean().optional(),
    in_trash: z.boolean().optional()
});

const CheckpointSchema = z.object({
    start_cursor: z.string()
});

type PageObject = z.infer<typeof PageObjectSchema>;
type DataSourceObject = z.infer<typeof DataSourceObjectSchema>;

/**
 * Extract title from search result
 */
function extractTitle(item: PageObject | DataSourceObject): string | undefined {
    if (item.object === 'page') {
        const titleProperty = item.properties?.title?.title;
        if (titleProperty && titleProperty.length > 0) {
            return titleProperty.map((t) => t.text.content).join('');
        }
    } else if (item.object === 'data_source') {
        const titleArray = item.title;
        if (titleArray && titleArray.length > 0) {
            return titleArray.map((t) => t.text.content).join('');
        }
    }
    return undefined;
}

/**
 * Extract parent information from page object
 */
function extractPageParent(item: PageObject): { parent_id?: string; parent_type?: string } {
    const parent = item.parent;
    if (!parent) {
        return {};
    }

    const parentType = parent.type;
    const result: { parent_id?: string; parent_type?: string } = {};

    if (parentType === 'page_id') {
        const pageId = parent.page_id;
        if (pageId !== undefined) {
            result.parent_id = pageId;
        }
    } else if (parentType === 'database_id') {
        const dbId = parent.database_id;
        if (dbId !== undefined) {
            result.parent_id = dbId;
        }
    } else if (parentType === 'workspace_id') {
        const wsId = parent.workspace_id;
        if (wsId !== undefined) {
            result.parent_id = wsId;
        }
    } else if (parentType === 'block_id') {
        const blockId = parent.block_id;
        if (blockId !== undefined) {
            result.parent_id = blockId;
        }
    }

    if (parentType !== undefined) {
        result.parent_type = parentType;
    }

    return result;
}

/**
 * Extract parent information from data source object
 */
function extractDataSourceParent(item: DataSourceObject): { parent_id?: string; parent_type?: string } {
    const parent = item.parent;
    if (!parent) {
        return {};
    }

    const result: { parent_id?: string; parent_type?: string } = {};

    const parentType = parent.type;
    if (parentType !== undefined) {
        result.parent_type = parentType;
    }

    const dbId = parent.database_id;
    if (dbId !== undefined) {
        result.parent_id = dbId;
    }

    return result;
}

/**
 * Extract parent information from search result
 */
function extractParent(item: PageObject | DataSourceObject): { parent_id?: string; parent_type?: string } {
    if (item.object === 'page') {
        return extractPageParent(item);
    }
    return extractDataSourceParent(item);
}

const sync = createSync({
    description: 'Sync page and data source metadata for broad Notion content discovery.',
    version: '3.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ContentMetadata: ContentMetadataSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/content-metadata'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;

        // https://developers.notion.com/reference/post-search
        let cursor = parsedCheckpoint?.success ? parsedCheckpoint.data.start_cursor : undefined;

        await nango.trackDeletesStart('ContentMetadata');
        let checkpointSaved = false;
        const hadExistingCheckpoint = !!cursor;

        // Manual pagination loop to avoid test mock provider lookup issues
        do {
            const response = await nango.post({
                endpoint: '/v1/search',
                data: {
                    query: '',
                    sort: {
                        timestamp: 'last_edited_time',
                        direction: 'ascending'
                    },
                    page_size: 100,
                    ...(cursor && { start_cursor: cursor })
                },
                retries: 3
            });

            const parsedResponse = z
                .object({
                    object: z.literal('list'),
                    results: z.array(z.unknown()),
                    next_cursor: z.string().nullable(),
                    has_more: z.boolean()
                })
                .safeParse(response.data);

            if (!parsedResponse.success) {
                throw new Error(`Invalid response from Notion API: ${parsedResponse.error.message}`);
            }

            const data = parsedResponse.data;
            const page = data.results;
            const metadataRecords: z.infer<typeof ContentMetadataSchema>[] = [];

            for (const item of page) {
                const parsedItem = SearchResultItemSchema.safeParse(item);
                if (!parsedItem.success) {
                    continue;
                }

                const itemData = parsedItem.data;
                const parentInfo = extractParent(itemData);

                const metadata: z.infer<typeof ContentMetadataSchema> = {
                    id: itemData.id,
                    object_type: itemData.object,
                    title: extractTitle(itemData),
                    created_time: itemData.created_time,
                    last_edited_time: itemData.last_edited_time,
                    parent_id: parentInfo.parent_id,
                    parent_type: parentInfo.parent_type,
                    url: itemData.url,
                    archived: itemData.object === 'page' ? itemData.archived : undefined,
                    in_trash: itemData.object === 'page' ? itemData.in_trash : undefined
                };

                metadataRecords.push(metadata);
            }

            if (metadataRecords.length > 0) {
                await nango.batchSave(metadataRecords, 'ContentMetadata');
            }

            const nextCursor = data.next_cursor ?? undefined;
            if (nextCursor) {
                await nango.saveCheckpoint({ start_cursor: nextCursor });
                checkpointSaved = true;
            }

            cursor = nextCursor;
        } while (cursor);

        await nango.trackDeletesEnd('ContentMetadata');
        if (checkpointSaved || hadExistingCheckpoint) {
            await nango.clearCheckpoint();
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
