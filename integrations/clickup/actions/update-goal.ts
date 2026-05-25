import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    goal_id: z.string().describe('The ID of the goal to update. Example: "2def2fe3-90cb-4332-8d3e-ba04e38c67ef"'),
    name: z.string().optional().describe('The name of the goal'),
    due_date: z.number().optional().describe('The due date as a Unix timestamp in milliseconds'),
    description: z.string().optional().describe('The description of the goal'),
    multiple_owners: z.boolean().optional().describe('Whether the goal has multiple owners'),
    color: z.string().optional().describe('The color of the goal in hex format')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Update a goal in ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'PUT',
        path: '/actions/update-goal',
        group: 'Goals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.name !== undefined) {
            requestBody['name'] = input.name;
        }
        if (input.due_date !== undefined) {
            requestBody['due_date'] = input.due_date;
        }
        if (input.description !== undefined) {
            requestBody['description'] = input.description;
        }
        if (input.multiple_owners !== undefined) {
            requestBody['multiple_owners'] = input.multiple_owners;
        }
        if (input.color !== undefined) {
            requestBody['color'] = input.color;
        }

        // https://developer.clickup.com/reference/update-goal
        await nango.put({
            endpoint: `/api/v2/goal/${encodeURIComponent(input.goal_id)}`,
            data: requestBody,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
