import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from_path: z.string().describe('The path of the file or folder to copy. Example: "/folder/myfile.txt"'),
    to_path: z.string().describe('The destination path for the copy. Example: "/folder/myfile_copy.txt"'),
    allow_shared_folder: z.boolean().optional().describe('If true, copy contents of shared folders.'),
    autorename: z.boolean().optional().describe('If true, auto-rename conflicting files.'),
    allow_ownership_transfer: z.boolean().optional().describe('If true, allow ownership transfer for files in shared folders.')
});

const ProviderMetadataSchema = z.object({
    name: z.string().describe('The name of the file or folder'),
    path_lower: z.string().optional().describe('The lowercased path'),
    path_display: z.string().optional().describe('The display path'),
    id: z.string().describe('The unique ID of the file or folder'),
    client_modified: z.string().optional().describe('Client modified timestamp for files'),
    server_modified: z.string().optional().describe('Server modified timestamp'),
    rev: z.string().optional().describe('Revision identifier'),
    size: z.number().optional().describe('Size in bytes'),
    is_downloadable: z.boolean().optional().describe('Whether file is downloadable'),
    content_hash: z.string().optional().describe('Content hash for files')
});

const ProviderResponseSchema = z.object({
    metadata: ProviderMetadataSchema
});

const OutputSchema = z.object({
    id: z.string().describe('The unique ID of the copied file or folder'),
    name: z.string().describe('The name of the copied file or folder'),
    path_lower: z.string().optional().describe('The lowercased path of the copy'),
    path_display: z.string().optional().describe('The display path of the copy'),
    size: z.number().optional().describe('Size in bytes'),
    client_modified: z.string().optional().describe('Client modified timestamp for files'),
    server_modified: z.string().optional().describe('Server modified timestamp'),
    rev: z.string().optional().describe('Revision identifier'),
    content_hash: z.string().optional().describe('Content hash for files')
});

const action = createAction({
    description: 'Copy a Dropbox file or folder to a different path.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/copy-file-or-folder',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.metadata.read', 'files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-copy_v2
        const response = await nango.post({
            endpoint: '/2/files/copy_v2',
            data: {
                from_path: input.from_path,
                to_path: input.to_path,
                ...(input.allow_shared_folder !== undefined && { allow_shared_folder: input.allow_shared_folder }),
                ...(input.autorename !== undefined && { autorename: input.autorename }),
                ...(input.allow_ownership_transfer !== undefined && { allow_ownership_transfer: input.allow_ownership_transfer })
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const metadata = parsedResponse.metadata;

        return {
            id: metadata.id,
            name: metadata.name,
            ...(metadata.path_lower !== undefined && { path_lower: metadata.path_lower }),
            ...(metadata.path_display !== undefined && { path_display: metadata.path_display }),
            ...(metadata.size !== undefined && { size: metadata.size }),
            ...(metadata.client_modified !== undefined && { client_modified: metadata.client_modified }),
            ...(metadata.server_modified !== undefined && { server_modified: metadata.server_modified }),
            ...(metadata.rev !== undefined && { rev: metadata.rev }),
            ...(metadata.content_hash !== undefined && { content_hash: metadata.content_hash })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
