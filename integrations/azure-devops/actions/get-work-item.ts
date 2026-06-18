import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangoapi"'),
    id: z.number().describe('Work item ID. Example: 1')
});

const ProviderWorkItemSchema = z.looseObject({
    id: z.number(),
    rev: z.number().optional(),
    url: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    relations: z.array(z.looseObject({})).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    rev: z.number().optional(),
    url: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    relations: z.array(z.looseObject({})).optional()
});

const action = createAction({
    description: 'Retrieve a work item by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-work-item',
        group: 'Work Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/workitems/${encodeURIComponent(String(input.id))}`,
            params: {
                'api-version': '7.2-preview.3',
                $expand: 'all'
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerWorkItem = ProviderWorkItemSchema.parse(response.data);

        return {
            id: providerWorkItem.id,
            ...(providerWorkItem.rev !== undefined && { rev: providerWorkItem.rev }),
            ...(providerWorkItem.url !== undefined && { url: providerWorkItem.url }),
            ...(providerWorkItem.fields !== undefined && { fields: providerWorkItem.fields }),
            ...(providerWorkItem.relations !== undefined && { relations: providerWorkItem.relations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
