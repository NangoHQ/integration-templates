import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().optional().describe('Path in the user\'s Dropbox to get metadata for. Example: "/folder/file.txt"'),
    id: z.string().optional().describe('Unique identifier for the file or folder. Can be used instead of path. Example: "id:a4ayc_80_OEAAAAAAAAAXw"')
});

const SharingInfoSchema = z.object({
    read_only: z.boolean().optional(),
    parent_shared_folder_id: z.string().optional(),
    modified_by: z.string().optional(),
    traverse_only: z.boolean().optional(),
    no_access: z.boolean().optional()
});

const FileMetadataSchema = z.object({
    '.tag': z.literal('file'),
    name: z.string(),
    id: z.string(),
    client_modified: z.string(),
    server_modified: z.string(),
    rev: z.string(),
    size: z.number(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    sharing_info: SharingInfoSchema.optional(),
    content_hash: z.string().optional(),
    has_explicit_shared_members: z.boolean().optional(),
    is_downloadable: z.boolean().optional(),
    media_info: z.any().optional()
});

const FolderMetadataSchema = z.object({
    '.tag': z.literal('folder'),
    name: z.string(),
    id: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    sharing_info: SharingInfoSchema.optional()
});

const DeletedMetadataSchema = z.object({
    '.tag': z.literal('deleted'),
    name: z.string(),
    id: z.string().optional(),
    path_lower: z.string().optional(),
    path_display: z.string().optional()
});

const ProviderMetadataSchema = z.union([FileMetadataSchema, FolderMetadataSchema, DeletedMetadataSchema]);

const SharingInfoOutputSchema = z.object({
    read_only: z.boolean().optional(),
    parent_shared_folder_id: z.string().optional(),
    modified_by: z.string().optional(),
    traverse_only: z.boolean().optional(),
    no_access: z.boolean().optional()
});

const FileOutputSchema = z.object({
    type: z.literal('file'),
    name: z.string(),
    id: z.string(),
    client_modified: z.string(),
    server_modified: z.string(),
    rev: z.string(),
    size: z.number(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    sharing_info: SharingInfoOutputSchema.optional(),
    content_hash: z.string().optional(),
    has_explicit_shared_members: z.boolean().optional(),
    is_downloadable: z.boolean().optional()
});

const FolderOutputSchema = z.object({
    type: z.literal('folder'),
    name: z.string(),
    id: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    sharing_info: SharingInfoOutputSchema.optional()
});

const DeletedOutputSchema = z.object({
    type: z.literal('deleted'),
    name: z.string(),
    id: z.string().optional(),
    path_lower: z.string().optional(),
    path_display: z.string().optional()
});

const OutputSchema = z.union([FileOutputSchema, FolderOutputSchema, DeletedOutputSchema]);

function isFileMetadata(data: z.infer<typeof ProviderMetadataSchema>): data is z.infer<typeof FileMetadataSchema> {
    return data['.tag'] === 'file';
}

function isFolderMetadata(data: z.infer<typeof ProviderMetadataSchema>): data is z.infer<typeof FolderMetadataSchema> {
    return data['.tag'] === 'folder';
}

function isDeletedMetadata(data: z.infer<typeof ProviderMetadataSchema>): data is z.infer<typeof DeletedMetadataSchema> {
    return data['.tag'] === 'deleted';
}

const action = createAction({
    description: 'Retrieve metadata for a Dropbox file or folder',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-file-or-folder-metadata',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.metadata.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.path === undefined && input.id === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either path or id must be provided'
            });
        }

        const requestPath = input.id !== undefined ? input.id : input.path;

        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_metadata
        const response = await nango.post({
            endpoint: '2/files/get_metadata',
            data: {
                path: requestPath
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File or folder not found',
                path: input.path,
                id: input.id
            });
        }

        const metadata = ProviderMetadataSchema.parse(response.data);

        if (isFileMetadata(metadata)) {
            return {
                type: 'file',
                name: metadata.name,
                id: metadata.id,
                client_modified: metadata.client_modified,
                server_modified: metadata.server_modified,
                rev: metadata.rev,
                size: metadata.size,
                path_lower: metadata.path_lower,
                path_display: metadata.path_display,
                sharing_info: metadata.sharing_info,
                content_hash: metadata.content_hash,
                has_explicit_shared_members: metadata.has_explicit_shared_members,
                is_downloadable: metadata.is_downloadable
            };
        }

        if (isFolderMetadata(metadata)) {
            return {
                type: 'folder',
                name: metadata.name,
                id: metadata.id,
                path_lower: metadata.path_lower,
                path_display: metadata.path_display,
                sharing_info: metadata.sharing_info
            };
        }

        if (isDeletedMetadata(metadata)) {
            return {
                type: 'deleted',
                name: metadata.name,
                id: metadata.id,
                path_lower: metadata.path_lower,
                path_display: metadata.path_display
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected metadata type received',
            tag: metadata['.tag']
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
