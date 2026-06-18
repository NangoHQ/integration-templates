import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The path in Dropbox where the folder should be created. Example: "/home/TestFolder"'),
    autorename: z
        .boolean()
        .optional()
        .describe('If true, the folder will be renamed to avoid conflicts if a folder already exists at the given path. Default: false')
});

const ProviderFolderMetadataSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string()
});

const ProviderResponseSchema = z.object({
    metadata: ProviderFolderMetadataSchema
});

const OutputSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string()
});

const action = createAction({
    description: 'Create a folder at a Dropbox path.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation
        // The create_folder_v2 endpoint creates a new folder at the specified path.
        const response = await nango.post({
            endpoint: '/2/files/create_folder_v2',
            data: {
                path: input.path,
                ...(input.autorename !== undefined && { autorename: input.autorename })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const metadata = providerResponse.metadata;

        return {
            name: metadata.name,
            ...(metadata.path_lower !== undefined && { path_lower: metadata.path_lower }),
            ...(metadata.path_display !== undefined && { path_display: metadata.path_display }),
            id: metadata.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
