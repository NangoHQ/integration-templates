import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    goal_id: z.string().describe('The ID of the goal to delete. Example: "2def2fe3-90cb-4332-8d3e-ba04e38c67ef"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the goal was successfully deleted')
});

const action = createAction({
    description: 'Delete a goal in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['goal:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/deletegoal
        const response = await nango.delete({
            endpoint: `/api/v2/goal/${encodeURIComponent(input.goal_id)}`,
            retries: 3
        });

        // ClickUp returns an empty object {} on successful deletion
        if (response.data && Object.keys(response.data).length === 0) {
            return { success: true };
        }

        // Handle unexpected responses
        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response from ClickUp API',
            response: response.data
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
