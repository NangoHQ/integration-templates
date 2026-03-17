import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier for the workflow to delete. Example: "123456789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    workflowId: z.string()
});

const action = createAction({
    description: 'Delete an automation workflow',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-a-workflow',
        group: 'Workflows'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['automation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/automation-automation-v4-v4/workflows/delete-automation-v4-flows-flowId
        await nango.delete({
            endpoint: `/automation/v4/flows/${input.workflowId}`,
            retries: 3
        });

        return {
            success: true,
            workflowId: input.workflowId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
