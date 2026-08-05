import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Initiative name. Example: "Q4 Product Roadmap"'),
    description: z.string().optional().describe('Initiative description. Example: "High-level plan for Q4"')
});

const ProviderInitiativeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        initiativeCreate: z.object({
            success: z.boolean(),
            initiative: ProviderInitiativeSchema.nullable()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a Linear initiative',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation CreateInitiative($input: InitiativeCreateInput!) {
                initiativeCreate(input: $input) {
                    success
                    initiative {
                        id
                        name
                        description
                        status
                        createdAt
                        updatedAt
                    }
                }
            }
        `;

        const variables = {
            input: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            }
        };

        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response',
                details: parsed.error.issues
            });
        }

        const result = parsed.data.data.initiativeCreate;
        if (!result.success || !result.initiative) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Initiative creation failed or returned no initiative'
            });
        }

        const initiative = result.initiative;

        return {
            id: initiative.id,
            name: initiative.name,
            ...(initiative.description != null && { description: initiative.description }),
            ...(initiative.status != null && { status: initiative.status }),
            ...(initiative.createdAt != null && { createdAt: initiative.createdAt }),
            ...(initiative.updatedAt != null && { updatedAt: initiative.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
