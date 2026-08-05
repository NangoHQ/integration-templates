import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID. Example: "315645a9-58c2-4f65-9628-3ce3ad2b6401"'),
    name: z.string().describe('Milestone name. Example: "Q3 Launch"'),
    targetDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format.')
        .refine(
            (value) => {
                // Reject impossible calendar dates (e.g. 2024-13-40, 2024-02-30) that the format
                // regex alone accepts. Parsing as UTC avoids timezone shifts, and comparing the
                // round-tripped ISO date catches rollovers such as Feb 30 -> Mar 1.
                const parsed = new Date(`${value}T00:00:00.000Z`);
                return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
            },
            { message: 'Must be a valid calendar date.' }
        )
        .optional()
        .describe('Target date as an ISO 8601 date string (YYYY-MM-DD). Example: "2026-09-01"')
});

const GraphQLErrorSchema = z
    .object({
        message: z.string()
    })
    .passthrough();

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
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
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
    version: '1.0.2',
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
            // Creating a milestone is not idempotent: a retry after a failed response could create a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors.map((e) => e.message).join(', ')
            });
        }

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
