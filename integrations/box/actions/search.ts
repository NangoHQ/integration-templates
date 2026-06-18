import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .describe('The string to search for. This query is matched against item names, descriptions, text content of files, and various other fields.'),
    type: z.enum(['file', 'folder', 'web_link']).optional().describe('Limits the search results to items of this type.'),
    file_extensions: z
        .array(z.string())
        .optional()
        .describe('Limits results to files matching any of the provided extensions (comma-separated list without dots).'),
    ancestor_folder_ids: z.array(z.string()).optional().describe('Limits results to items within the given folders (comma-separated list of folder IDs).'),
    created_at_range: z.array(z.string()).optional().describe('Limits results to items created within a date range (comma-separated RFC3339 timestamps).'),
    updated_at_range: z.array(z.string()).optional().describe('Limits results to items updated within a date range (comma-separated RFC3339 timestamps).'),
    size_range: z.array(z.number()).optional().describe('Limits results to items within a file size range (comma-separated byte sizes).'),
    owner_user_ids: z.array(z.string()).optional().describe('Limits results to items owned by the given users (comma-separated list of user IDs).'),
    recent_updater_user_ids: z
        .array(z.string())
        .optional()
        .describe('Limits results to items recently updated by the given users (comma-separated list of user IDs).'),
    content_types: z
        .array(z.enum(['name', 'description', 'file_content', 'comments', 'tags']))
        .optional()
        .describe('Limits search to match specific content parts (comma-separated list).'),
    trash_content: z
        .enum(['non_trashed_only', 'trashed_only', 'all_items'])
        .optional()
        .describe('Determines if the search should look in trash. Defaults to non_trashed_only.'),
    sort: z.enum(['relevance', 'modified_at']).optional().describe('Defines the order of search results. Defaults to relevance.'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('Defines the direction of ordering. Defaults to DESC.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of items to return per page. Defaults to 30, max 200.'),
    offset: z.number().int().optional().describe('The offset of the first item to return. Defaults to 0.'),
    scope: z
        .enum(['user_content', 'enterprise_content'])
        .optional()
        .describe('Limits results to user content or enterprise content. Defaults to user_content.'),
    fields: z.array(z.string()).optional().describe('Comma-separated list of attributes to include in the response.'),
    include_recent_shared_links: z.boolean().optional().describe('Whether to include items accessed through shared links.'),
    deleted_user_ids: z.array(z.string()).optional().describe('Limits results to items deleted by the given users (requires trash_content=trashed_only).'),
    deleted_at_range: z.array(z.string()).optional().describe('Limits results to items deleted within a date range (requires trash_content=trashed_only).')
});

const SearchItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    path_collection: z
        .object({
            entries: z.array(
                z.object({
                    type: z.string(),
                    id: z.string(),
                    name: z.string().optional()
                })
            )
        })
        .optional()
});

const OutputSchema = z.object({
    total_count: z.number(),
    limit: z.number(),
    offset: z.number(),
    entries: z.array(SearchItemSchema)
});

const action = createAction({
    description: 'Search for files, folders, and other content in Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {
            query: input.query
        };

        if (input.type !== undefined) {
            params['type'] = input.type;
        }
        if (input.file_extensions !== undefined && input.file_extensions.length > 0) {
            params['file_extensions'] = input.file_extensions;
        }
        if (input.ancestor_folder_ids !== undefined && input.ancestor_folder_ids.length > 0) {
            params['ancestor_folder_ids'] = input.ancestor_folder_ids;
        }
        if (input.created_at_range !== undefined && input.created_at_range.length > 0) {
            params['created_at_range'] = input.created_at_range;
        }
        if (input.updated_at_range !== undefined && input.updated_at_range.length > 0) {
            params['updated_at_range'] = input.updated_at_range;
        }
        if (input.size_range !== undefined && input.size_range.length > 0) {
            params['size_range'] = input.size_range;
        }
        if (input.owner_user_ids !== undefined && input.owner_user_ids.length > 0) {
            params['owner_user_ids'] = input.owner_user_ids;
        }
        if (input.recent_updater_user_ids !== undefined && input.recent_updater_user_ids.length > 0) {
            params['recent_updater_user_ids'] = input.recent_updater_user_ids;
        }
        if (input.content_types !== undefined && input.content_types.length > 0) {
            params['content_types'] = input.content_types;
        }
        if (input.trash_content !== undefined) {
            params['trash_content'] = input.trash_content;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.direction !== undefined) {
            params['direction'] = input.direction;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }
        if (input.scope !== undefined) {
            params['scope'] = input.scope;
        }
        if (input.fields !== undefined && input.fields.length > 0) {
            params['fields'] = input.fields;
        }
        if (input.deleted_user_ids !== undefined && input.deleted_user_ids.length > 0) {
            params['deleted_user_ids'] = input.deleted_user_ids;
        }
        if (input.deleted_at_range !== undefined && input.deleted_at_range.length > 0) {
            params['deleted_at_range'] = input.deleted_at_range;
        }
        if (input.include_recent_shared_links !== undefined) {
            params['include_recent_shared_links'] = String(input.include_recent_shared_links);
        }

        // https://developer.box.com/reference/get-search/
        const response = await nango.get({
            endpoint: '/2.0/search',
            params: params,
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'search_failed',
                message: 'Failed to search Box content',
                status: response.status
            });
        }

        const data = response.data;

        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Box API'
            });
        }

        const entries = Array.isArray(data['entries']) ? data['entries'] : [];

        const mappedEntries: Array<{
            type: string;
            id: string;
            name?: string;
            description?: string;
            size?: number;
            created_at?: string;
            modified_at?: string;
            path_collection?: {
                entries: Array<{
                    type: string;
                    id: string;
                    name?: string;
                }>;
            };
        }> = [];

        for (const entry of entries) {
            if (entry === null || typeof entry !== 'object') {
                continue;
            }

            const item = entry;
            const mappedItem: {
                type: string;
                id: string;
                name?: string;
                description?: string;
                size?: number;
                created_at?: string;
                modified_at?: string;
                path_collection?: {
                    entries: Array<{
                        type: string;
                        id: string;
                        name?: string;
                    }>;
                };
            } = {
                type: typeof item['type'] === 'string' ? item['type'] : '',
                id: typeof item['id'] === 'string' ? item['id'] : ''
            };

            if (item['name'] != null && typeof item['name'] === 'string') {
                mappedItem['name'] = item['name'];
            }
            if (item['description'] != null && typeof item['description'] === 'string') {
                mappedItem['description'] = item['description'];
            }
            if (item['size'] != null && typeof item['size'] === 'number') {
                mappedItem['size'] = item['size'];
            }
            if (item['created_at'] != null && typeof item['created_at'] === 'string') {
                mappedItem['created_at'] = item['created_at'];
            }
            if (item['modified_at'] != null && typeof item['modified_at'] === 'string') {
                mappedItem['modified_at'] = item['modified_at'];
            }
            if (item['path_collection'] != null && typeof item['path_collection'] === 'object' && item['path_collection'] !== null) {
                const pathCollection = item['path_collection'];
                const pathEntries = Array.isArray(pathCollection['entries']) ? pathCollection['entries'] : [];
                const mappedPathEntries: Array<{
                    type: string;
                    id: string;
                    name?: string;
                }> = [];

                for (const e of pathEntries) {
                    if (e === null || typeof e !== 'object') {
                        continue;
                    }
                    const pathEntry = e;
                    const mappedPathEntry: {
                        type: string;
                        id: string;
                        name?: string;
                    } = {
                        type: typeof pathEntry['type'] === 'string' ? pathEntry['type'] : '',
                        id: typeof pathEntry['id'] === 'string' ? pathEntry['id'] : ''
                    };
                    if (pathEntry['name'] != null && typeof pathEntry['name'] === 'string') {
                        mappedPathEntry['name'] = pathEntry['name'];
                    }
                    mappedPathEntries.push(mappedPathEntry);
                }

                mappedItem['path_collection'] = {
                    entries: mappedPathEntries
                };
            }

            mappedEntries.push(mappedItem);
        }

        return {
            total_count: typeof data['total_count'] === 'number' ? data['total_count'] : 0,
            limit: typeof data['limit'] === 'number' ? data['limit'] : 30,
            offset: typeof data['offset'] === 'number' ? data['offset'] : 0,
            entries: mappedEntries
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
