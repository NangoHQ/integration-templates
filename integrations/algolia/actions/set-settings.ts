import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    settings: z.record(z.string(), z.unknown()).describe('Index settings to apply. See https://www.algolia.com/doc/api-reference/settings-api-parameters/')
});

const ProviderResponseSchema = z.object({
    updatedAt: z.string().optional(),
    taskID: z.number().optional()
});

const OutputSchema = z.object({
    updatedAt: z.string().optional(),
    taskID: z.number().optional()
});

const action = createAction({
    description: 'Update Algolia index settings.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#setsettings
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/settings`,
            data: input.settings,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_provider_response',
                message: 'Provider returned an unexpected response format.',
                raw: response.data
            });
        }

        return {
            ...(parsed.data.updatedAt != null && { updatedAt: parsed.data.updatedAt }),
            ...(parsed.data.taskID != null && { taskID: parsed.data.taskID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
