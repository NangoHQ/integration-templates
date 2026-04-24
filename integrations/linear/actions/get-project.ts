import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The unique identifier of the Linear project. Example: "7b277fbc-8b76-4cdc-ad25-cd735ca33d0c"')
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    targetDate: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    canceledAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    lead: ProviderLeadSchema.nullable().optional(),
    progress: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    lead: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    progress: z.number().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    startedAt: z.string().optional(),
    canceledAt: z.string().optional(),
    completedAt: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Linear project by project ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    query Project($id: String!) {
                        project(id: $id) {
                            id
                            name
                            description
                            state
                            startDate
                            targetDate
                            startedAt
                            canceledAt
                            completedAt
                            lead {
                                id
                                name
                                email
                            }
                            progress
                        }
                    }
                `,
                variables: {
                    id: input.projectId
                }
            },
            retries: 3
        });

        if (response.data?.errors && response.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: response.data.errors[0].message
            });
        }

        if (!response.data?.data?.project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project with ID "${input.projectId}" not found.`
            });
        }

        const project = ProviderProjectSchema.parse(response.data.data.project);

        return {
            id: project.id,
            ...(project.name != null && { name: project.name }),
            ...(project.description != null && { description: project.description }),
            ...(project.state != null && { status: project.state }),
            ...(project.lead != null && {
                lead: {
                    id: project.lead.id,
                    ...(project.lead.name != null && { name: project.lead.name }),
                    ...(project.lead.email != null && { email: project.lead.email })
                }
            }),
            ...(project.progress != null && { progress: project.progress }),
            ...(project.startDate != null && { startDate: project.startDate }),
            ...(project.targetDate != null && { targetDate: project.targetDate }),
            ...(project.startedAt != null && { startedAt: project.startedAt }),
            ...(project.canceledAt != null && { canceledAt: project.canceledAt }),
            ...(project.completedAt != null && { completedAt: project.completedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
