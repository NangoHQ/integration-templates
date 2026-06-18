import { z } from 'zod';
import { createAction } from 'nango';

// https://www.dropbox.com/developers/documentation/http/documentation#files-list_revisions

const ListFileRevisionsInputSchema = z.object({
    path: z.string().describe('The path to the file or a file ID. Example: "/folder/document.txt" or "id:a4aycG80J0UAAAAAAAAcZA"'),
    mode: z
        .enum(['path', 'id'])
        .optional()
        .describe(
            'Specify how to interpret the path argument. "path" (default): revisions at the same file path are returned. "id": revisions for the file ID (survives moves and renames).'
        ),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of revisions to return. Defaults to 10.')
});

const FileRevisionSchema = z.object({
    name: z.string().describe('The last component of the path (including extension).'),
    path_lower: z.string().optional().describe("The lowercased full path in the user's Dropbox."),
    path_display: z.string().optional().describe('The cased path to be shown to the user.'),
    id: z.string().describe('A unique identifier for the file.'),
    client_modified: z.string().optional().describe('For files, this is the modification time set by the client.'),
    server_modified: z.string().describe('The last modified time of the file.'),
    rev: z.string().describe('A unique identifier for the current revision of a file.'),
    size: z.number().describe('The file size in bytes.'),
    content_hash: z.string().optional().describe('A hash of the file content.'),
    is_downloadable: z.boolean().optional().describe('If true, file can be downloaded directly.'),
    has_explicit_shared_members: z.boolean().optional().describe('Whether this file has any explicit shared members.')
});

const ListFileRevisionsOutputSchema = z.object({
    is_deleted: z.boolean().optional().describe('If true, this file was deleted.'),
    entries: z.array(FileRevisionSchema).describe('The revisions for the file.'),
    cursor: z.string().optional().describe('Pass the cursor into files/list_revisions/continue to paginate through the entries.')
});

const action = createAction({
    description: 'List revisions for a Dropbox file by path or file id.',
    version: '1.0.1',
    input: ListFileRevisionsInputSchema,
    output: ListFileRevisionsOutputSchema,
    scopes: ['files.metadata.read'],

    exec: async (nango, input): Promise<z.infer<typeof ListFileRevisionsOutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_revisions
        const response = await nango.post({
            endpoint: '/2/files/list_revisions',
            data: {
                path: input.path,
                mode: input.mode || 'path',
                limit: input.limit || 10
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Dropbox API'
            });
        }

        const rawEntries = response.data.entries || [];
        const entries = rawEntries.map(
            (entry: {
                name: string;
                path_lower?: string;
                path_display?: string;
                id: string;
                client_modified?: string;
                server_modified: string;
                rev: string;
                size: number;
                content_hash?: string;
                is_downloadable?: boolean;
                has_explicit_shared_members?: boolean;
            }) => ({
                name: entry.name,
                ...(entry.path_lower !== undefined && { path_lower: entry.path_lower }),
                ...(entry.path_display !== undefined && { path_display: entry.path_display }),
                id: entry.id,
                ...(entry.client_modified !== undefined && { client_modified: entry.client_modified }),
                server_modified: entry.server_modified,
                rev: entry.rev,
                size: entry.size,
                ...(entry.content_hash !== undefined && { content_hash: entry.content_hash }),
                ...(entry.is_downloadable !== undefined && { is_downloadable: entry.is_downloadable }),
                ...(entry.has_explicit_shared_members !== undefined && { has_explicit_shared_members: entry.has_explicit_shared_members })
            })
        );

        return {
            entries,
            ...(response.data.is_deleted !== undefined && { is_deleted: response.data.is_deleted }),
            ...(response.data.cursor !== undefined && response.data.cursor !== null && { cursor: response.data.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
