import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The ID of the folder to retrieve. Example: "901516078072"')
});

const SpaceSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.union([z.string(), z.number()]),
    override_statuses: z.boolean().nullable().optional(),
    hidden: z.boolean().nullable().optional(),
    space: SpaceSchema,
    task_count: z.union([z.string(), z.number()]).nullable().optional(),
    lists: z.array(ListSchema).optional(),
    archived: z.boolean().nullable().optional(),
    parent_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    override_statuses: z.boolean().optional(),
    hidden: z.boolean().optional(),
    space: SpaceSchema,
    task_count: z.number().optional(),
    lists: z.array(ListSchema).optional(),
    archived: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single folder from ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/getfolder
        const response = await nango.get({
            endpoint: `/api/v2/folder/${encodeURIComponent(input.folder_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Folder not found',
                folder_id: input.folder_id
            });
        }

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            ...(providerFolder.override_statuses != null && { override_statuses: providerFolder.override_statuses }),
            ...(providerFolder.hidden != null && { hidden: providerFolder.hidden }),
            space: providerFolder.space,
            ...(providerFolder.task_count != null && {
                task_count: typeof providerFolder.task_count === 'string' ? parseInt(providerFolder.task_count, 10) : providerFolder.task_count
            }),
            ...(providerFolder.lists != null && { lists: providerFolder.lists }),
            ...(providerFolder.archived != null && { archived: providerFolder.archived })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
