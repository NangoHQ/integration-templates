import { z } from 'zod';
import { createAction } from 'nango';

const PatchOperationSchema = z.object({
    op: z.string().describe('JSON Patch operation. Example: "replace"'),
    path: z.string().describe('Target path. Example: "/fields/System.Title"'),
    value: z.unknown().optional().describe('New value for the path.')
});

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangodev"'),
    work_item_id: z.number().describe('Work item ID to update. Example: 1'),
    patches: z.array(PatchOperationSchema).describe('JSON Patch operations. Example: [{ op: "replace", path: "/fields/System.Title", value: "New title" }]')
});

const ProviderWorkItemSchema = z.object({
    id: z.number(),
    rev: z.number(),
    url: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    rev: z.number(),
    url: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update a work item using JSON Patch',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-work-item',
        group: 'Work Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/workitems/${encodeURIComponent(String(input.work_item_id))}`,
            params: {
                'api-version': '7.2-preview.3'
            },
            data: input.patches,
            headers: {
                'Content-Type': 'application/json-patch+json'
            },
            retries: 10
        });

        const providerWorkItem = ProviderWorkItemSchema.parse(response.data);

        return {
            id: providerWorkItem.id,
            rev: providerWorkItem.rev,
            url: providerWorkItem.url,
            ...(providerWorkItem.fields !== undefined && { fields: providerWorkItem.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
