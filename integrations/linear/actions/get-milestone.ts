import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    milestoneId: z.string().describe('The ID of the project milestone to retrieve. Example: "1c52e20d-a929-4a42-88e6-72ef225d9403"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderMilestoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    targetDate: z.string().nullable().optional(),
    project: ProviderProjectSchema.nullable().optional()
});

const GraphQLErrorSchema = z
    .object({
        message: z.string()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z
        .object({
            projectMilestone: ProviderMilestoneSchema.nullable().optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    targetDate: z.string().optional(),
    project: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a Linear project milestone by milestone ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/api-reference/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `query ProjectMilestone($id: String!) {
    projectMilestone(id: $id) {
        id
        name
        targetDate
        project {
            id
            name
        }
    }
}`,
                variables: {
                    id: input.milestoneId
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const milestone = parsed.data?.projectMilestone;

        if (!milestone) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project milestone not found',
                milestoneId: input.milestoneId
            });
        }

        return {
            id: milestone.id,
            name: milestone.name,
            ...(milestone.targetDate != null && { targetDate: milestone.targetDate }),
            ...(milestone.project != null && {
                project: {
                    id: milestone.project.id,
                    name: milestone.project.name
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
