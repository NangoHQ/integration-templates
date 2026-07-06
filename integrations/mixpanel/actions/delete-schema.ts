import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.number().int().positive().describe('Your project id. Example: 4040293'),
    entityType: z.enum(['event', 'profile']).describe('The entity type. Example: event'),
    name: z.string().min(1).describe('The entity name. Example: nango_seed_event')
});

const OutputSchema = z.object({
    status: z.string(),
    delete_count: z.number().optional()
});

const action = createAction({
    description: 'Delete one Lexicon schema by entity and name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.mixpanel.com/reference/delete-schema-by-entity-and-name
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.projectId))}/schemas/${encodeURIComponent(input.entityType)}/${encodeURIComponent(input.name)}`,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'The API returned an empty response.'
            });
        }

        const ProviderResponseSchema = z.object({
            status: z.string(),
            results: z
                .object({
                    delete_count: z.number().optional()
                })
                .optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            status: parsed.status,
            ...(parsed.results?.delete_count !== undefined && { delete_count: parsed.results.delete_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
