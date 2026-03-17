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
    pageSize: z.number().optional().describe('Maximum number of files to return per page. Default is 100.')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    modifiedTime: z.string().optional(),
    size: z.string().optional(),
    webViewLink: z.string().optional()
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    nextPageToken: z.string().optional().describe('Pagination cursor for the next page. Omitted if no more results.'),
    totalResults: z.number().optional().describe('Total number of files returned in this page')
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
            pageSize: input.pageSize || 100
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
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            size: file.size,
            webViewLink: file.webViewLink
        }));

        return {
            files,
            nextPageToken: response.data.nextPageToken || undefined,
            totalResults: files.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
