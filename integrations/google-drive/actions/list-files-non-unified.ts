import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().optional().describe('Folder ID to list contents. Omit for root folder.'),
    cursor: z.string().optional().describe('Pagination cursor (pageToken) from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Maximum number of files to return. Default: 100.'),
    include_shared_drives: z.boolean().optional().describe('Include items from shared drives. Default: false.')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    mime_type: z.string(),
    is_folder: z.boolean(),
    parent_id: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    modified_at: z.union([z.string(), z.null()]),
    size: z.union([z.number(), z.null()]),
    web_view_link: z.union([z.string(), z.null()]),
    thumbnail_link: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Cursor for next page. Null if no more pages.'),
    total_count: z.number().describe('Total number of files in this page.')
});

const action = createAction({
    description: 'List immediate files and folders for a folder ID, or root when omitted, with cursor pagination and shared-drive support.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-files-non-unified',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build query for listing files in the specified folder
        const parentId = input.folder_id || 'root';
        const query = `'${parentId}' in parents and trashed = false`;

        const params: Record<string, string | number> = {
            q: query,
            fields: 'files(id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,thumbnailLink),nextPageToken',
            pageSize: input.limit || 100
        };

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        if (input.include_shared_drives) {
            params['includeItemsFromAllDrives'] = 'true';
            params['supportsAllDrives'] = 'true';
        }

        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
        const response = await nango.get({
            endpoint: '/drive/v3/files',
            params,
            retries: 3
        });

        const files = (response.data.files || []).map(
            (file: {
                id: string;
                name: string;
                mimeType: string;
                parents?: string[];
                createdTime?: string;
                modifiedTime?: string;
                size?: string;
                webViewLink?: string;
                thumbnailLink?: string;
            }) => ({
                id: file.id,
                name: file.name,
                mime_type: file.mimeType,
                is_folder: file.mimeType === 'application/vnd.google-apps.folder',
                parent_id: file.parents?.[0] || null,
                created_at: file.createdTime || null,
                modified_at: file.modifiedTime || null,
                size: file.size ? parseInt(file.size, 10) : null,
                web_view_link: file.webViewLink || null,
                thumbnail_link: file.thumbnailLink || null
            })
        );

        return {
            files,
            next_cursor: response.data.nextPageToken || null,
            total_count: files.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
