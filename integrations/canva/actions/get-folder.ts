import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().describe('The folder ID. Example: "root" or "FAHNA0uMKHU"')
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    thumbnail: ThumbnailSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    thumbnail: ThumbnailSchema.optional()
});

const action = createAction({
    description: 'Retrieve folder metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['folder:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/folders/get-folder/
            endpoint: `/rest/v1/folders/${encodeURIComponent(input.folderId)}`,
            retries: 3
        });

        const providerData = z.object({ folder: FolderSchema }).parse(response.data);
        const folder = providerData.folder;

        return {
            id: folder.id,
            name: folder.name,
            created_at: folder.created_at,
            updated_at: folder.updated_at,
            ...(folder.thumbnail !== undefined && { thumbnail: folder.thumbnail })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
