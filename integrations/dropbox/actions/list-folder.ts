import { z } from 'zod';
import { createAction } from 'nango';

const ListFolderInputSchema = z.object({
    path: z.string().optional().describe('The path to the folder to list. Use "" (empty string) or omit for root folder. Example: "/Homework/math"'),
    recursive: z.boolean().optional().describe('If true, list contents recursively for all subfolders. Default: false'),
    include_deleted: z.boolean().optional().describe('If true, include entries for files and folders that were deleted. Default: false'),
    limit: z.number().int().min(1).max(2000).optional().describe('Maximum number of entries to return per request (1-2000).'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. If provided, continues listing from that point.')
});

const MetadataSchema = z.object({
    '.tag': z.enum(['file', 'folder', 'deleted']),
    id: z.string().optional(),
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional()
});

const ListFolderOutputSchema = z.object({
    entries: z.array(z.any()).describe('The files and folders in the directory.'),
    cursor: z.string().optional().describe('Cursor for retrieving more entries via list_folder/continue.'),
    has_more: z.boolean().describe('True if more entries are available.')
});

const ListFolderResultSchema = z.object({
    entries: z.array(MetadataSchema),
    cursor: z.string(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List Dropbox folder contents with pagination and optional recursion.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-folder',
        group: 'Files'
    },
    input: ListFolderInputSchema,
    output: ListFolderOutputSchema,
    scopes: ['files.metadata.read'],

    exec: async (nango, input): Promise<z.infer<typeof ListFolderOutputSchema>> => {
        const allEntries: z.infer<typeof MetadataSchema>[] = [];
        const path = input.path ?? '';
        const recursive = input.recursive ?? false;
        const includeDeleted = input.include_deleted ?? false;
        const limit = input.limit;
        let cursor: string | undefined = input.cursor;
        let hasMore = true;

        if (cursor) {
            while (hasMore && allEntries.length < (limit || Infinity)) {
                // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
                const continueResponse = await nango.post({
                    endpoint: '/2/files/list_folder/continue',
                    data: {
                        cursor: cursor
                    },
                    retries: 3
                });

                const result = ListFolderResultSchema.parse(continueResponse.data);

                for (const entry of result.entries) {
                    const parsed = MetadataSchema.parse(entry);
                    allEntries.push(parsed);
                    if (limit && allEntries.length >= limit) {
                        break;
                    }
                }

                cursor = result.cursor;
                hasMore = result.has_more;

                if (limit && allEntries.length >= limit) {
                    break;
                }
            }

            return {
                entries: allEntries,
                cursor: hasMore ? cursor : undefined,
                has_more: hasMore
            };
        }

        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
        const initialResponse = await nango.post({
            endpoint: '/2/files/list_folder',
            data: {
                path: path,
                recursive: recursive,
                include_deleted: includeDeleted,
                include_mounted_folders: true,
                include_non_downloadable_files: true,
                limit: limit
            },
            retries: 3
        });

        const initialResult = ListFolderResultSchema.parse(initialResponse.data);

        for (const entry of initialResult.entries) {
            const parsed = MetadataSchema.parse(entry);
            allEntries.push(parsed);
            if (limit && allEntries.length >= limit) {
                break;
            }
        }

        cursor = initialResult.cursor;
        hasMore = initialResult.has_more;

        while (hasMore && (!limit || allEntries.length < limit)) {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
            const continueResponse = await nango.post({
                endpoint: '/2/files/list_folder/continue',
                data: {
                    cursor: cursor
                },
                retries: 3
            });

            const result = ListFolderResultSchema.parse(continueResponse.data);

            for (const entry of result.entries) {
                const parsed = MetadataSchema.parse(entry);
                allEntries.push(parsed);
                if (limit && allEntries.length >= limit) {
                    break;
                }
            }

            cursor = result.cursor;
            hasMore = result.has_more;

            if (limit && allEntries.length >= limit) {
                break;
            }
        }

        return {
            entries: allEntries,
            cursor: hasMore ? cursor : undefined,
            has_more: hasMore
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
