import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(255).describe('The name of the folder. Example: "My awesome holiday"'),
    parent_folder_id: z
        .string()
        .min(1)
        .max(50)
        .describe('The folder ID of the parent folder. Use "root" for top-level or "uploads" for the Uploads folder. Example: "FAF2lZtloor"')
});

const ThumbnailSchema = z.object({
    width: z.number().describe('The width of the thumbnail image in pixels.'),
    height: z.number().describe('The height of the thumbnail image in pixels.'),
    url: z.string().describe('A URL for retrieving the thumbnail image.')
});

const FolderSchema = z.object({
    id: z.string().describe('The folder ID. Example: "FAF2lZtloor"'),
    name: z.string().describe('The folder name. Example: "My awesome holiday"'),
    created_at: z.number().describe('When the folder was created, as a Unix timestamp (in seconds since the Unix Epoch).'),
    updated_at: z.number().describe('When the folder was last updated, as a Unix timestamp (in seconds since the Unix Epoch).'),
    thumbnail: ThumbnailSchema.optional()
});

const OutputSchema = z.object({
    folder: FolderSchema
});

const action = createAction({
    description: 'Create a folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['folder:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/folders/create-folder/
            endpoint: '/rest/v1/folders',
            data: {
                name: input.name,
                parent_folder_id: input.parent_folder_id
            },
            retries: 1
        });

        const providerResponse = z.object({ folder: z.unknown() }).parse(response.data);
        const folder = FolderSchema.parse(providerResponse.folder);

        return {
            folder: {
                id: folder.id,
                name: folder.name,
                created_at: folder.created_at,
                updated_at: folder.updated_at,
                ...(folder.thumbnail !== undefined && { thumbnail: folder.thumbnail })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
