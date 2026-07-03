import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Mixpanel project ID. Example: 4040293'),
    entity_type: z.enum(['event', 'profile']).describe('Entity type. Example: "event" or "profile"'),
    entity_name: z.string().optional().describe('Optional entity name to delete a specific schema. Example: "Added To Cart"')
});

const ProviderResponseSchema = z.object({
    results: z.object({
        delete_count: z.number()
    }),
    status: z.string()
});

const OutputSchema = z.object({
    results: z.object({
        delete_count: z.number()
    }),
    status: z.string()
});

const action = createAction({
    description: 'Delete all Lexicon schemas for an entity type',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.mixpanel.com/reference/delete-schemas-for-entity
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.project_id))}/schemas/${encodeURIComponent(input.entity_type)}`,
            params: {
                ...(input.entity_name !== undefined && { entity_name: input.entity_name })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            results: {
                delete_count: providerResponse.results.delete_count
            },
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
