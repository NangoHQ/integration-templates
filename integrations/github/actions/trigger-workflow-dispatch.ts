import { createAction } from 'nango';
import * as z from 'zod';

const workflowDispatchResponseSchema = z.object({
    workflow_run_id: z.number().optional(),
    run_url: z.string().optional(),
    html_url: z.string().optional()
});

const action = createAction({
    description: 'Trigger a GitHub Actions workflow_dispatch run for a workflow file or ID',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/trigger-workflow-dispatch', group: 'Actions' },
    input: z.object({
        owner: z.string(),
        repo: z.string(),
        workflow_id: z.string(),
        ref: z.string(),
        inputs: z.record(z.string(), z.string()).optional()
    }),
    output: workflowDispatchResponseSchema,

    exec: async (nango, input) => {
        // https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(input.workflow_id)}/dispatches`,
            data: {
                ref: input.ref,
                ...(input.inputs && { inputs: input.inputs })
            },
            retries: 3
        });

        // The response data may be empty (204 No Content) or contain workflow run details
        const responseData = response.data || {};
        return {
            workflow_run_id: responseData.workflow_run_id,
            run_url: responseData.run_url,
            html_url: responseData.html_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
