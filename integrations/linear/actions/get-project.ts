import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The unique identifier of the project. Example: "abc123-def456"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    status: z.union([z.object({ name: z.string() }), z.null()]),
    lead: z.union([
        z.object({
            id: z.string(),
            name: z.string()
        }),
        z.null()
    ]),
    progress: z.union([z.number(), z.null()]),
    startDate: z.union([z.string(), z.null()]),
    targetDate: z.union([z.string(), z.null()]),
    startedAt: z.union([z.string(), z.null()]),
    completedAt: z.union([z.string(), z.null()]),
    canceledAt: z.union([z.string(), z.null()]),
    slugId: z.string(),
    url: z.string()
});

const action = createAction({
    description: 'Retrieve a Linear project by project ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query GetProject($id: String!) {
                        project(id: $id) {
                            id
                            name
                            description
                            state
                            status {
                                name
                            }
                            lead {
                                id
                                name
                            }
                            progress
                            startDate
                            targetDate
                            startedAt
                            completedAt
                            canceledAt
                            slugId
                            url
                        }
                    }
                `,
                variables: {
                    id: input.projectId
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project with ID "${input.projectId}" not found`,
                projectId: input.projectId
            });
        }

        const project = response.data.data.project;

        return {
            id: project.id,
            name: project.name,
            description: project.description ?? null,
            state: project.state ?? null,
            status: project.status ?? null,
            lead: project.lead
                ? {
                      id: project.lead.id,
                      name: project.lead.name
                  }
                : null,
            progress: typeof project.progress === 'number' ? project.progress : null,
            startDate: project.startDate ?? null,
            targetDate: project.targetDate ?? null,
            startedAt: project.startedAt ?? null,
            completedAt: project.completedAt ?? null,
            canceledAt: project.canceledAt ?? null,
            slugId: project.slugId,
            url: project.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
