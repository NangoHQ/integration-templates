import { z } from 'zod';
import { createAction } from 'nango';

// Helper function to check if value is a Record<string, unknown>
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Helper function to clean block objects by removing API-generated fields
function cleanBlock(block: Record<string, unknown>): Record<string, unknown> | null {
    // Get the block type - blocks must have a type field
    const blockType = block['type'];
    if (typeof blockType !== 'string') {
        return null;
    }

    const cleaned: Record<string, unknown> = {};

    // Always include type and object fields
    cleaned['type'] = blockType;
    if ('object' in block && typeof block['object'] === 'string') {
        cleaned['object'] = block['object'];
    }

    // Get the block content based on type (e.g., paragraph, heading_1, etc.)
    const blockContent = block[blockType];
    if (isRecord(blockContent)) {
        const cleanedContent: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(blockContent)) {
            // Skip API-generated fields
            if (['id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by'].includes(key)) {
                continue;
            }
            // Skip null values
            if (value === null) {
                continue;
            }
            // Keep arrays as-is
            if (Array.isArray(value)) {
                cleanedContent[key] = value;
            } else if (isRecord(value)) {
                // Recursively clean nested objects
                cleanedContent[key] = cleanBlock(value);
            } else {
                cleanedContent[key] = value;
            }
        }
        cleaned[blockType] = cleanedContent;
    }

    return cleaned;
}

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the Notion page to duplicate. Example: "35261e8ce0a38035a054fcdf4d7e1a31"'),
    parent_page_id: z
        .string()
        .optional()
        .describe(
            'Optional ID of the parent page where the duplicated page should be created. If not provided, the duplicated page will be created under the same parent as the original.'
        ),
    title: z
        .string()
        .optional()
        .describe('Optional title for the duplicated page. If not provided, the original page title will be used with " (Copy)" suffix.')
});

const ParentSchema = z.object({
    type: z.string(),
    page_id: z.string().optional(),
    database_id: z.string().optional(),
    data_source_id: z.string().optional(),
    workspace: z.boolean().optional()
});

const PageSchema = z.object({
    object: z.literal('page'),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    created_by: z
        .object({
            object: z.literal('user'),
            id: z.string()
        })
        .optional(),
    last_edited_by: z
        .object({
            object: z.literal('user'),
            id: z.string()
        })
        .optional(),
    cover: z.unknown().nullable().optional(),
    icon: z.unknown().nullable().optional(),
    parent: ParentSchema,
    archived: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    properties: z.object({}).passthrough(),
    url: z.string().optional(),
    public_url: z.string().nullable().optional()
});

const BlockSchema = z.object({}).passthrough();

const BlockListSchema = z.object({
    object: z.literal('list'),
    results: z.array(BlockSchema),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the duplicated page'),
    url: z.string().optional().describe('The URL of the duplicated page'),
    title: z.string().optional().describe('The title of the duplicated page')
});

const action = createAction({
    description: 'Duplicate a Notion page and its content',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/duplicate-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_content', 'insert_content'],

    exec: async (nango, input) => {
        // Step 1: Retrieve the source page to get its properties
        // https://developers.notion.com/reference/retrieve-a-page
        const pageResponse = await nango.get({
            endpoint: `/v1/pages/${encodeURIComponent(input.page_id)}`,
            retries: 3
        });

        if (!pageResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Source page not found',
                page_id: input.page_id
            });
        }

        const sourcePage = PageSchema.parse(pageResponse.data);

        // Step 2: Retrieve the page's block children (content)
        // https://developers.notion.com/reference/get-block-children
        const blocksResponse = await nango.get({
            endpoint: `/v1/blocks/${encodeURIComponent(input.page_id)}/children`,
            params: {
                page_size: '100'
            },
            retries: 3
        });

        let blocks: unknown[] = [];
        if (blocksResponse.data) {
            const blockList = BlockListSchema.parse(blocksResponse.data);
            blocks = blockList.results;
        }

        // Step 3: Prepare the parent for the new page
        let parent: Record<string, unknown>;
        if (input.parent_page_id) {
            parent = {
                type: 'page_id',
                page_id: input.parent_page_id
            };
        } else {
            // Use the same parent as the original page
            parent = sourcePage.parent;
        }

        // Step 4: Prepare the properties
        // For pages with page_id or workspace parent, only title is allowed
        // For pages with database_id or data_source_id parent, we need to filter properties
        let properties: Record<string, unknown> = {};

        if (parent['type'] === 'page_id' || parent['type'] === 'workspace') {
            // For page parents, only the title property is allowed
            const sourceTitle = sourcePage.properties['title'];
            let newTitle: string;
            if (input.title) {
                newTitle = input.title;
            } else {
                // Extract text from title property
                if (sourceTitle && isRecord(sourceTitle) && 'title' in sourceTitle) {
                    const titleArray = sourceTitle['title'];
                    if (Array.isArray(titleArray)) {
                        const originalTitle =
                            titleArray
                                .map((t) => {
                                    if (typeof t === 'object' && t !== null) {
                                        const text = t['text'];
                                        const plainText = t['plain_text'];
                                        if (typeof plainText === 'string') return plainText;
                                        if (typeof text === 'object' && text !== null) {
                                            const content = text['content'];
                                            if (typeof content === 'string') return content;
                                        }
                                    }
                                    return '';
                                })
                                .join('') || 'Untitled';
                        newTitle = `${originalTitle} (Copy)`;
                    } else {
                        newTitle = 'Untitled (Copy)';
                    }
                } else {
                    newTitle = 'Untitled (Copy)';
                }
            }
            properties = {
                title: {
                    title: [{ text: { content: newTitle } }]
                }
            };
        } else if (parent['type'] === 'database_id' || parent['type'] === 'data_source_id') {
            // For database parents, we need to handle properties differently
            // Filter out system properties and prepare clean properties object
            const cleanProperties: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(sourcePage.properties)) {
                // Skip system properties like 'id', 'type', etc.
                if (key !== 'id' && isRecord(value)) {
                    const propValue = value;
                    // Extract the actual value based on property type
                    const propType = propValue['type'];
                    if (typeof propType === 'string' && propType in propValue) {
                        cleanProperties[key] = { [propType]: propValue[propType] };
                    }
                }
            }
            properties = cleanProperties;
        }

        // Step 5: Create the new page with the duplicated content
        // https://developers.notion.com/reference/post-page
        const createPagePayload: Record<string, unknown> = {
            parent,
            properties
        };

        // Add blocks if we have them (clean them first to remove API-generated fields)
        if (blocks.length > 0) {
            const cleanedBlocks = blocks
                .map((block) => {
                    if (isRecord(block)) {
                        return cleanBlock(block);
                    }
                    return null;
                })
                .filter((block): block is Record<string, unknown> => block !== null && isRecord(block));
            createPagePayload['children'] = cleanedBlocks;
        }

        // Add icon if the source page has one
        if (sourcePage.icon) {
            createPagePayload['icon'] = sourcePage.icon;
        }

        // Add cover if the source page has one
        if (sourcePage.cover) {
            createPagePayload['cover'] = sourcePage.cover;
        }

        const createResponse = await nango.post({
            endpoint: '/v1/pages',
            data: createPagePayload,
            retries: 1
        });

        if (!createResponse.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create duplicated page'
            });
        }

        const newPage = PageSchema.parse(createResponse.data);

        // Extract title for output
        let outputTitle: string | undefined;
        const newTitleProp = newPage.properties['title'];
        if (newTitleProp && isRecord(newTitleProp) && 'title' in newTitleProp) {
            const titleArray = newTitleProp['title'];
            if (Array.isArray(titleArray)) {
                outputTitle =
                    titleArray
                        .map((t) => {
                            if (typeof t === 'object' && t !== null) {
                                const plainText = t['plain_text'];
                                if (typeof plainText === 'string') return plainText;
                            }
                            return '';
                        })
                        .join('') || undefined;
            }
        }

        return {
            id: newPage.id,
            url: newPage.url,
            title: outputTitle
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
