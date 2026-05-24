import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    goal_id: z.string().describe('Goal ID. Example: "2def2fe3-90cb-4332-8d3e-ba04e38c67ef"')
});

const ProviderGoalSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    color: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    private: z.boolean(),
    archived: z.boolean(),
    members: z.array(z.unknown()).optional(),
    owners: z.array(z.unknown()).optional(),
    key_results: z.array(z.unknown()).optional(),
    percent_completed: z.number().optional()
});

const ProviderResponseSchema = z.object({
    goal: ProviderGoalSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    color: z.string().optional(),
    due_date: z.string().optional(),
    description: z.string().optional(),
    private: z.boolean(),
    archived: z.boolean(),
    members: z.array(z.unknown()).optional(),
    owners: z.array(z.unknown()).optional(),
    key_results: z.array(z.unknown()).optional(),
    percent_completed: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single goal from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-goal',
        group: 'Goals'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/getgoal
        const response = await nango.get({
            endpoint: `/api/v2/goal/${encodeURIComponent(input.goal_id)}`,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse goal data from ClickUp API',
                parse_error: parsedResponse.error.message
            });
        }

        const goal = parsedResponse.data.goal;

        return {
            id: goal.id,
            name: goal.name,
            team_id: goal.team_id,
            ...(goal.color != null && { color: goal.color }),
            ...(goal.due_date != null && { due_date: goal.due_date }),
            ...(goal.description != null && { description: goal.description }),
            private: goal.private,
            archived: goal.archived,
            ...(goal.members != null && { members: goal.members }),
            ...(goal.owners != null && { owners: goal.owners }),
            ...(goal.key_results != null && { key_results: goal.key_results }),
            ...(goal.percent_completed != null && { percent_completed: goal.percent_completed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
