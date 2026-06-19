import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the folder to update. Example: "901516078072"'),
    name: z.string().describe('The new name for the folder. Example: "Updated Folder Name"')
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    override_statuses: z.boolean().optional(),
    hidden: z.boolean().optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    task_count: z.string().optional(),
    lists: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number().optional(),
    override_statuses: z.boolean().optional(),
    hidden: z.boolean().optional(),
    space_id: z.string().optional(),
    task_count: z.string().optional()
});

const action = createAction({
    description: 'Update a folder in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/updatefolder
        const response = await nango.put({
            endpoint: `/api/v2/folder/${encodeURIComponent(input.id)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const folder = ProviderFolderSchema.parse(response.data);

        return {
            id: folder.id,
            name: folder.name,
            ...(folder.orderindex !== undefined && { orderindex: folder.orderindex }),
            ...(folder.override_statuses !== undefined && { override_statuses: folder.override_statuses }),
            ...(folder.hidden !== undefined && { hidden: folder.hidden }),
            ...(folder.space?.id !== undefined && { space_id: folder.space.id }),
            ...(folder.task_count !== undefined && { task_count: folder.task_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
