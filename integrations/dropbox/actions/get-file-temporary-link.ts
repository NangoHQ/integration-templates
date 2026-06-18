import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The path to the file you want a temporary link to. Example: "/folder/file.txt"')
});

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

const ProviderOutputSchema = z.object({
    metadata: ProviderMetadataSchema,
    link: z.string()
});

const OutputSchema = z.object({
    metadata: z.object({
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
    }),
    link: z.string().describe('Temporary link to stream content of the file. Expires after four hours.')
});

const action = createAction({
    description: 'Generate a temporary Dropbox link for file content streaming.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
        const response = await nango.post({
            endpoint: '/2/files/get_temporary_link',
            data: {
                path: input.path
            },
            retries: 3
        });

        const result = ProviderOutputSchema.parse(response.data);

        return {
            metadata: {
                name: result.metadata.name,
                ...(result.metadata.path_lower !== undefined && { path_lower: result.metadata.path_lower }),
                ...(result.metadata.path_display !== undefined && { path_display: result.metadata.path_display }),
                id: result.metadata.id,
                ...(result.metadata.client_modified !== undefined && { client_modified: result.metadata.client_modified }),
                ...(result.metadata.server_modified !== undefined && { server_modified: result.metadata.server_modified }),
                ...(result.metadata.rev !== undefined && { rev: result.metadata.rev }),
                ...(result.metadata.size !== undefined && { size: result.metadata.size }),
                ...(result.metadata.is_downloadable !== undefined && { is_downloadable: result.metadata.is_downloadable }),
                ...(result.metadata.content_hash !== undefined && { content_hash: result.metadata.content_hash })
            },
            link: result.link
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
