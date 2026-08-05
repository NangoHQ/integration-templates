import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Project ID. Example: "315645a9-58c2-4f65-9628-3ce3ad2b6401"')
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

const GraphQLErrorResponseSchema = z.object({
    errors: z.array(
        z.object({
            message: z.string()
        })
    )
});

const ProviderResponseSchema = z.object({
    data: z.object({
        projectUnarchive: z.object({
            success: z.boolean(),
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
    url: z.string().optional(),
    success: z.boolean()
});

const action = createAction({
    description: 'Restore an archived Linear project.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ProjectUnarchive($id: String!) {
                        projectUnarchive(id: $id) {
                            success
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
                    id: input.id
                }
            },
            retries: 3
        });

        const errorResponse = GraphQLErrorResponseSchema.safeParse(response.data);
        if (errorResponse.success && errorResponse.data.errors.length > 0) {
            const firstError = errorResponse.data.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message
                });
            }
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const project = providerResponse.data.data.projectUnarchive.entity;

        if (!project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found or was deleted',
                projectId: input.id
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
            ...(project.url !== undefined && { url: project.url }),
            success: providerResponse.data.data.projectUnarchive.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
