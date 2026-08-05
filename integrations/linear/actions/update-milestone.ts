import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the project milestone to update. Example: "1c52e20d-a929-4a42-88e6-72ef225d9403"'),
    name: z.string().optional().describe('The new name of the milestone.'),
    description: z.string().nullable().optional().describe('The new description. Pass null to clear.'),
    targetDate: z.string().nullable().optional().describe('The target date in YYYY-MM-DD format. Pass null to clear.'),
    projectId: z.string().nullable().optional().describe('The identifier of the project to associate with the milestone. Pass null to clear.')
});

const ProviderProjectMilestoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    targetDate: z.string().nullable().optional(),
    project: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .nullable()
        .optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z
        .object({
            code: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            projectMilestoneUpdate: z
                .object({
                    success: z.boolean(),
                    projectMilestone: ProviderProjectMilestoneSchema.nullable().optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    targetDate: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const action = createAction({
    description: 'Update an existing Linear project milestone.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateInput: Record<string, unknown> = {};

        if (input.name !== undefined) {
            updateInput['name'] = input.name;
        }
        if (input.description !== undefined) {
            updateInput['description'] = input.description;
        }
        if (input.targetDate !== undefined) {
            updateInput['targetDate'] = input.targetDate;
        }
        if (input.projectId !== undefined) {
            updateInput['projectId'] = input.projectId;
        }

        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ProjectMilestoneUpdate($id: String!, $input: ProjectMilestoneUpdateInput!) {
                        projectMilestoneUpdate(id: $id, input: $input) {
                            success
                            projectMilestone {
                                id
                                name
                                description
                                targetDate
                                project {
                                    id
                                    name
                                }
                                createdAt
                                updatedAt
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    input: updateInput
                }
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors[0]?.message || 'Unknown GraphQL error',
                errors: parsed.errors
            });
        }

        if (!parsed.data || !parsed.data.projectMilestoneUpdate) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Project milestone update returned no data.'
            });
        }

        const result = parsed.data.projectMilestoneUpdate;

        if (!result.success || !result.projectMilestone) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Project milestone update was not successful.'
            });
        }

        const milestone = result.projectMilestone;

        return {
            id: milestone.id,
            name: milestone.name,
            ...(milestone.description != null && { description: milestone.description }),
            ...(milestone.targetDate != null && { targetDate: milestone.targetDate }),
            ...(milestone.project != null && {
                projectId: milestone.project.id,
                projectName: milestone.project.name
            }),
            createdAt: milestone.createdAt,
            updatedAt: milestone.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
