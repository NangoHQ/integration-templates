import { z } from 'zod';
import { createAction } from 'nango';

const JsonPatchOperationSchema = z.object({
    op: z.string(),
    path: z.string(),
    value: z.unknown().optional(),
    from: z.unknown().optional()
});

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "MyProject"'),
    type: z.string().describe('Work item type. Example: "Task"'),
    fields: z
        .array(JsonPatchOperationSchema)
        .describe('JSON Patch operations for work item fields. Example: [{ op: "add", path: "/fields/System.Title", value: "New task" }]')
});

const OutputSchema = z.object({
    id: z.number().describe('Work item ID.'),
    rev: z.number().describe('Work item revision.'),
    url: z.string().describe('Work item URL.'),
    fields: z.record(z.string(), z.unknown()).optional().describe('Work item fields.')
});

const action = createAction({
    description: 'Create a work item of a given type using JSON Patch.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.2
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/workitems/$${encodeURIComponent(input.type)}`,
            params: {
                'api-version': '7.2-preview.3'
            },
            headers: {
                'Content-Type': 'application/json-patch+json'
            },
            data: input.fields,
            retries: 3
        });

        const providerWorkItem = OutputSchema.parse(response.data);

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
