import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier of the workflow. Example: "6a6b328004308879e7d439b6"')
});

const ProviderWorkflowSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Get full details of a single workflow, including its current schema and attribute values.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderWorkflowSchema,
    scopes: ['public.workflows.read'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderWorkflowSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/get-workflow
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}`,
            retries: 3
        });

        const workflow = ProviderWorkflowSchema.parse(response.data);

        return workflow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
