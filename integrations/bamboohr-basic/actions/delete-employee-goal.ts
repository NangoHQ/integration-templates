import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "123"'),
    goalId: z.string().describe('Goal ID. Example: "456"')
});

const ProviderResponseSchema = z
    .object({
        success: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    employeeId: z.string(),
    goalId: z.string()
});

const action = createAction({
    description: 'Delete a performance goal from an employee record in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-employee-goal'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.delete({
            // https://documentation.bamboohr.com/reference/delete-goal
            endpoint: `/v1/performance/employees/${encodeURIComponent(input.employeeId)}/goals/${encodeURIComponent(input.goalId)}`,
            retries: 3
        });

        if (response.data) {
            const providerResponse = ProviderResponseSchema.parse(response.data);
            return {
                success: providerResponse.success ?? true,
                employeeId: input.employeeId,
                goalId: input.goalId
            };
        }

        return {
            success: true,
            employeeId: input.employeeId,
            goalId: input.goalId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
