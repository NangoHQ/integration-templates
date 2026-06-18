import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('Path to the file or folder to delete. Example: "/path/to/file.txt" or "/path/to/folder"')
});

// Dropbox API returns metadata about the deleted item
// Using snake_case to match Dropbox API conventions
const ProviderMetadataSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string().optional(),
    size: z.number().optional(),
    is_downloadable: z.boolean().optional(),
    content_hash: z.string().optional()
});

const ProviderResponseSchema = z.object({
    metadata: ProviderMetadataSchema
});

const OutputSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string().optional(),
    size: z.number().optional(),
    is_downloadable: z.boolean().optional(),
    content_hash: z.string().optional()
});

const action = createAction({
    description: 'Delete a Dropbox file or folder by path',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-delete_v2
        const response = await nango.post({
            endpoint: '2/files/delete_v2',
            data: {
                path: input.path
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const metadata = providerResponse.metadata;

        return {
            name: metadata.name,
            ...(metadata.path_lower !== undefined && { path_lower: metadata.path_lower }),
            ...(metadata.path_display !== undefined && { path_display: metadata.path_display }),
            id: metadata.id,
            ...(metadata.client_modified !== undefined && { client_modified: metadata.client_modified }),
            ...(metadata.server_modified !== undefined && { server_modified: metadata.server_modified }),
            ...(metadata.rev !== undefined && { rev: metadata.rev }),
            ...(metadata.size !== undefined && { size: metadata.size }),
            ...(metadata.is_downloadable !== undefined && { is_downloadable: metadata.is_downloadable }),
            ...(metadata.content_hash !== undefined && { content_hash: metadata.content_hash })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
