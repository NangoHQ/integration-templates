import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The identifier of the project to restore. Example: "123e4567-e89b-12d3-a456-426614174000"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    state: z.string().optional(),
    archivedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        projectUnarchive: z.object({
            success: z.boolean(),
            lastSyncId: z.number(),
            entity: ProviderProjectSchema.nullable()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    state: z.string().optional(),
    archivedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Restore an archived Linear project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unarchive-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    mutation projectUnarchive($id: String!) {
                        projectUnarchive(id: $id) {
                            success
                            lastSyncId
                            entity {
                                id
                                name
                                slugId
                                state
                                archivedAt
                                createdAt
                                updatedAt
                                url
                            }
                        }
                    }
                `,
                variables: {
                    id: input.projectId
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const project = providerResponse.data.projectUnarchive.entity;

        if (!project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found or was deleted',
                projectId: input.projectId
            });
        }

        return {
            id: project.id,
            name: project.name,
            slugId: project.slugId,
            ...(project.state !== undefined && { state: project.state }),
            ...(project.archivedAt !== undefined && { archivedAt: project.archivedAt }),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            ...(project.url !== undefined && { url: project.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
