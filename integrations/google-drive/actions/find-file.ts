import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .optional()
        .describe(
            'Search query string. Uses Google Drive search query syntax. Example: "name contains \'report\'" or "mimeType = \'application/pdf\'". If not provided, returns all files.'
        ),
    cursor: z.string().optional().describe('Pagination cursor (nextPageToken) from previous response. Omit for first page.'),
    page_size: z.number().optional().describe('Maximum number of files to return per page. Default is 100.')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    mime_type: z.string(),
    modified_time: z.string().optional(),
    size: z.string().optional(),
    web_view_link: z.string().optional()
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Pagination cursor for the next page. Null if no more results.'),
    total_results: z.number().optional().describe('Total number of files returned in this page')
});

const action = createAction({
    description: 'Search for files by name or query in Google Drive',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/find-file',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
        const params: Record<string, string | number> = {
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)',
            orderBy: 'modifiedTime desc',
            pageSize: input.page_size || 100
        };

        if (input.query) {
            params['q'] = input.query;
        }

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        const response = await nango.get({
            endpoint: '/drive/v3/files',
            params,
            retries: 3
        });

        const files = (response.data.files || []).map((file: any) => ({
            id: file.id,
            name: file.name,
            mime_type: file.mimeType,
            modified_time: file.modifiedTime,
            size: file.size,
            web_view_link: file.webViewLink
        }));

        return {
            files,
            next_cursor: response.data.nextPageToken || null,
            total_results: files.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
