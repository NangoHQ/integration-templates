import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    team_id: z.string().describe('ClickUp team ID. Example: "90152560096"')
});

const InputSchema = z.object({
    name: z.string().describe('Name of the goal. Example: "Q1 Revenue Target"'),
    team_id: z.string().optional().describe('ClickUp team ID. Optional - uses metadata if not provided. Example: "90152560096"'),
    due_date: z.number().optional().describe('Due date in milliseconds since epoch. Example: 1704067200000'),
    description: z.string().optional().describe('Description of the goal. Example: "Increase revenue by 20% in Q1"'),
    multiple_owners: z.boolean().optional().describe('Whether the goal can have multiple owners.'),
    color: z.string().optional().describe('Color code for the goal in hex format. Example: "#ff0000"'),
    owners: z
        .array(
            z.object({
                id: z.string(),
                type: z.enum(['user', 'team'])
            })
        )
        .optional()
        .describe('Array of owners for the goal')
});

const OwnerSchema = z.object({
    id: z.string(),
    type: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    color: z.string().optional()
});

const ProviderGoalSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    description: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    multiple_owners: z.boolean().nullable().optional(),
    owners: z.array(OwnerSchema).optional(),
    creator: z.number().optional(),
    date_created: z.string().optional(),
    pretty_id: z.string().optional(),
    archived: z.boolean().optional(),
    completed: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    goal: ProviderGoalSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    color: z.string().optional(),
    multiple_owners: z.boolean().optional(),
    owners: z.array(OwnerSchema).optional()
});

const action = createAction({
    description: 'Create a goal in ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-goal',
        group: 'Goals'
    },
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let teamId = input.team_id;

        if (!teamId) {
            const metadata = await nango.getMetadata<{ team_id?: string }>();
            teamId = metadata?.team_id;
        }

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'team_id is required in input or metadata.'
            });
        }

        const requestBody: Record<string, unknown> = {
            name: input.name
        };

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
        if (input.owners !== undefined) {
            requestBody['owners'] = input.owners;
        }

        // https://developer.clickup.com/reference/create-goal
        const response = await nango.post({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/goal`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from ClickUp API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const goal = providerResponse.goal;

        return {
            id: goal.id,
            name: goal.name,
            team_id: goal.team_id,
            ...(goal.description != null && { description: goal.description }),
            ...(goal.due_date != null && { due_date: goal.due_date }),
            ...(goal.color != null && goal.color !== '' && { color: goal.color }),
            ...(goal.multiple_owners != null && { multiple_owners: goal.multiple_owners }),
            ...(goal.owners != null && { owners: goal.owners })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
