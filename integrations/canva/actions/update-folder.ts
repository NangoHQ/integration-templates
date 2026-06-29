import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().describe('The folder ID. Example: FAF2lZtloor'),
    name: z.string().describe('The new folder name. Example: My awesome holiday')
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    thumbnail: ThumbnailSchema.optional()
});

const ProviderResponseSchema = z.object({
    folder: ProviderFolderSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    thumbnail: ThumbnailSchema.optional()
});

const action = createAction({
    description: 'Update a folder name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['folder:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://www.canva.dev/docs/connect/api-reference/folders/update-folder/
            endpoint: `/rest/v1/folders/${encodeURIComponent(input.folderId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.folder.id,
            name: providerResponse.folder.name,
            created_at: providerResponse.folder.created_at,
            updated_at: providerResponse.folder.updated_at,
            ...(providerResponse.folder.thumbnail !== undefined && {
                thumbnail: providerResponse.folder.thumbnail
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
