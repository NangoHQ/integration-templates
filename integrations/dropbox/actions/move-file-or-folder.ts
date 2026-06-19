import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from_path: z.string().describe('The path to the file or folder to be moved. Example: "/Folder/File.txt"'),
    to_path: z.string().describe('The destination path, including the new name for the file or folder. Example: "/NewFolder/NewFile.txt"'),
    allow_shared_folder: z.boolean().optional().describe('If true, move will take into account the shared folder permissions. Default: false'),
    autorename: z.boolean().optional().describe('If true, rename will be attempted if a conflict occurs. Default: false')
});

const RelocationResultSchema = z.object({
    metadata: z
        .object({
            name: z.string(),
            path_lower: z.string().optional(),
            path_display: z.string().optional(),
            id: z.string(),
            content_hash: z.string().optional(),
            rev: z.string().optional(),
            size: z.number().optional(),
            client_modified: z.string().optional(),
            server_modified: z.string().optional(),
            is_downloadable: z.boolean().optional(),
            '.tag': z.union([z.literal('file'), z.literal('folder')]).optional()
        })
        .passthrough()
});

const OutputSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string(),
    content_hash: z.string().optional(),
    rev: z.string().optional(),
    size: z.number().optional(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    is_downloadable: z.boolean().optional(),
    tag: z.union([z.literal('file'), z.literal('folder')]).optional()
});

const action = createAction({
    description: 'Move a Dropbox file or folder to a different path',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.dropbox.com/developers/documentation/http/documentation#files-move_v2
            endpoint: '/2/files/move_v2',
            data: {
                from_path: input.from_path,
                to_path: input.to_path,
                allow_shared_folder: input.allow_shared_folder ?? false,
                autorename: input.autorename ?? false
            },
            retries: 3
        });

        const result = RelocationResultSchema.parse(response.data);
        const metadata = result.metadata;

        return {
            name: metadata.name,
            id: metadata.id,
            ...(metadata.path_lower !== undefined && { path_lower: metadata.path_lower }),
            ...(metadata.path_display !== undefined && { path_display: metadata.path_display }),
            ...(metadata.content_hash !== undefined && { content_hash: metadata.content_hash }),
            ...(metadata.rev !== undefined && { rev: metadata.rev }),
            ...(metadata.size !== undefined && { size: metadata.size }),
            ...(metadata.client_modified !== undefined && { client_modified: metadata.client_modified }),
            ...(metadata.server_modified !== undefined && { server_modified: metadata.server_modified }),
            ...(metadata.is_downloadable !== undefined && { is_downloadable: metadata.is_downloadable }),
            ...(metadata['.tag'] !== undefined && { tag: metadata['.tag'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
