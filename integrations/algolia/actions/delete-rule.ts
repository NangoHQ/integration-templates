import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    index_name: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    object_id: z.string().describe('Object ID of the query rule to delete. Example: "nango-test-rule-update-1"')
});

const ProviderDeleteRuleResponseSchema = z.object({
    taskID: z.number().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    object_id: z.string(),
    task_id: z.number().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Delete a query rule from an Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-rule',
        group: 'Rules'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.algolia.com/doc/rest-api/search/#delete-a-rule
            endpoint: `/1/indexes/${encodeURIComponent(input.index_name)}/rules/${encodeURIComponent(input.object_id)}`,
            retries: 3
        });

        const parsed = ProviderDeleteRuleResponseSchema.parse(response.data);

        return {
            success: true,
            object_id: input.object_id,
            ...(parsed.taskID !== undefined && { task_id: parsed.taskID }),
            ...(parsed.updatedAt !== undefined && { updated_at: parsed.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
