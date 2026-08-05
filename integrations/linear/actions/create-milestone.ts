import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID. Example: "315645a9-58c2-4f65-9628-3ce3ad2b6401"'),
    name: z.string().describe('Milestone name. Example: "Q3 Launch"'),
    targetDate: z.string().optional().describe('Target date as an ISO 8601 date string (YYYY-MM-DD). Example: "2026-09-01"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            projectMilestoneCreate: z
                .object({
                    success: z.boolean(),
                    projectMilestone: z
                        .object({
                            id: z.string(),
                            name: z.string(),
                            targetDate: z.string().nullable().optional(),
                            createdAt: z.string(),
                            updatedAt: z.string(),
                            project: z
                                .object({
                                    id: z.string(),
                                    name: z.string()
                                })
                                .nullable()
                                .optional()
                        })
                        .nullable()
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    targetDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    project: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Create a milestone within a Linear project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CreateProjectMilestone($input: ProjectMilestoneCreateInput!) {
                        projectMilestoneCreate(input: $input) {
                            success
                            projectMilestone {
                                id
                                name
                                targetDate
                                createdAt
                                updatedAt
                                project {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        projectId: input.projectId,
                        name: input.name,
                        ...(input.targetDate !== undefined && { targetDate: input.targetDate })
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const createResult = providerResponse.data?.projectMilestoneCreate;

        if (!createResult || !createResult.success || !createResult.projectMilestone) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create project milestone'
            });
        }

        const projectMilestone = createResult.projectMilestone;

        return {
            id: projectMilestone.id,
            name: projectMilestone.name,
            ...(projectMilestone.targetDate != null && { targetDate: projectMilestone.targetDate }),
            createdAt: projectMilestone.createdAt,
            updatedAt: projectMilestone.updatedAt,
            ...(projectMilestone.project != null && { project: { id: projectMilestone.project.id, name: projectMilestone.project.name } })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
