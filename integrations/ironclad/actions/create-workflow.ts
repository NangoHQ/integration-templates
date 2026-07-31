import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template: z.string().describe('Workflow schema/template ID. Example: "68dc41e5a7987b1e623e4711"'),
    attributes: z
        .record(z.string(), z.unknown())
        .describe('Attribute values keyed by attribute ID. IDs are schema-specific and discoverable via list-workflow-schemas/get-workflow-schema.')
});

const ProviderWorkflowSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        template: z.string().optional(),
        step: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Launch a new contract workflow synchronously from a workflow schema/template.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderWorkflowSchema,
    scopes: ['public.workflows.createWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderWorkflowSchema>> => {
        const response = await nango.post({
            // https://developer.ironcladapp.com/
            endpoint: '/public/api/v1/workflows',
            data: {
                template: input.template,
                attributes: input.attributes
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Workflow creation returned an empty response.'
            });
        }

        const providerWorkflow = ProviderWorkflowSchema.parse(response.data);

        return providerWorkflow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
