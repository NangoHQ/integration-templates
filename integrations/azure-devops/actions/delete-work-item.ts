import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "MyProject"'),
    workItemId: z.number().int().describe('ID of the work item to delete. Example: 123'),
    destroy: z.boolean().optional().describe('If true, permanently destroys the work item instead of moving it to the Recycle Bin.')
});

const ProviderWorkItemDeleteSchema = z
    .object({
        id: z.number().optional(),
        deletedBy: z.string().optional(),
        deletedDate: z.string().optional(),
        project: z.string().optional(),
        type: z.string().optional(),
        name: z.string().optional(),
        url: z.string().optional(),
        message: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().describe('The deleted work item ID.'),
    project: z.string().describe('The project identifier used in the request.'),
    deleted: z.boolean().describe('Whether the deletion succeeded.'),
    destroy: z.boolean().describe('Whether the permanent destroy flag was used.'),
    deletedBy: z.string().optional(),
    deletedDate: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Delete a work item by ID (moves to recycle bin).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            'api-version': '7.2-preview.3'
        };

        if (input.destroy === true) {
            params['destroy'] = 'true';
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/delete?view=azure-devops-rest-7.2
        const response = await nango.delete({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/workitems/${encodeURIComponent(String(input.workItemId))}`,
            params,
            retries: 1
        });

        const providerData = response.data && typeof response.data === 'object' ? ProviderWorkItemDeleteSchema.parse(response.data) : undefined;

        return {
            id: providerData?.id ?? input.workItemId,
            project: providerData?.project ?? input.project,
            deleted: true,
            destroy: input.destroy === true,
            ...(providerData?.deletedBy && { deletedBy: providerData.deletedBy }),
            ...(providerData?.deletedDate && { deletedDate: providerData.deletedDate }),
            ...(providerData?.type && { type: providerData.type }),
            ...(providerData?.name && { name: providerData.name }),
            ...(providerData?.url && { url: providerData.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
