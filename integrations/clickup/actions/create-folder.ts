import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    space_id: z.string().describe('Space ID where the folder will be created. Example: "901511023604"'),
    name: z.string().describe('Name of the folder to create. Example: "New Folder"')
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    space: z.object({
        id: z.string(),
        name: z.string()
    }),
    lists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    space: z.object({
        id: z.string(),
        name: z.string()
    }),
    lists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a folder in ClickUp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-folder',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/create-folder
        const response = await nango.post({
            endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}/folder`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const folder = ProviderFolderSchema.parse(response.data);

        return {
            id: folder.id,
            name: folder.name,
            space: folder.space,
            ...(folder.lists !== undefined && { lists: folder.lists }),
            ...(folder.created_at !== undefined && { created_at: folder.created_at }),
            ...(folder.updated_at !== undefined && { updated_at: folder.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
