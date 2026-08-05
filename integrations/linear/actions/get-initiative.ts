import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Initiative ID. Example: "7bf5d043-8868-454c-9da8-6948a8d21972"')
});

const ProviderInitiativeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string()
});

const action = createAction({
    description: 'Retrieve a Linear initiative by initiative ID',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    query GetInitiative($id: String!) {
                        initiative(id: $id) {
                            id
                            name
                            description
                            status
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Linear API'
            });
        }

        const rawData = response.data;

        if ('errors' in rawData && Array.isArray(rawData.errors) && rawData.errors.length > 0) {
            const firstError = rawData.errors[0];
            const errorMessage =
                firstError && typeof firstError === 'object' && 'message' in firstError && typeof firstError.message === 'string'
                    ? firstError.message
                    : 'GraphQL error';

            throw new nango.ActionError({
                type: 'graphql_error',
                message: errorMessage
            });
        }

        if (!('data' in rawData) || !rawData.data || typeof rawData.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Initiative not found'
            });
        }

        const graphQLData = rawData.data;

        if (!graphQLData || typeof graphQLData !== 'object' || !('initiative' in graphQLData)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Initiative not found'
            });
        }

        const initiativeData = graphQLData.initiative;

        if (!initiativeData || typeof initiativeData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Initiative not found'
            });
        }

        const providerInitiative = ProviderInitiativeSchema.parse(initiativeData);

        return {
            id: providerInitiative.id,
            name: providerInitiative.name,
            ...(providerInitiative.description != null && { description: providerInitiative.description }),
            status: providerInitiative.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
