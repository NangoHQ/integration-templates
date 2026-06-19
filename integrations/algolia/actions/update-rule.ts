import { z } from 'zod';
import { createAction } from 'nango';

const ConditionSchema = z
    .object({
        pattern: z.string().optional(),
        anchoring: z.string().optional(),
        alternatives: z.boolean().optional(),
        context: z.string().optional(),
        filters: z.string().optional()
    })
    .passthrough();

const TimeRangeSchema = z.object({
    from: z.number().optional(),
    until: z.number().optional()
});

const ConsequenceSchema = z
    .object({
        params: z.record(z.string(), z.unknown()).optional(),
        promote: z.array(z.record(z.string(), z.unknown())).optional(),
        hide: z.array(z.record(z.string(), z.unknown())).optional(),
        filterPromotes: z.boolean().optional(),
        redirect: z
            .object({
                indexName: z.string()
            })
            .optional(),
        userData: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const InputSchema = z.object({
    index_name: z.string().describe('Name of the Algolia index. Example: algolia_movie_sample_dataset'),
    object_id: z.string().describe('Unique identifier of the rule. Example: nango-test-rule-update-1'),
    conditions: z.array(ConditionSchema).optional(),
    consequence: ConsequenceSchema,
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    validity: z.array(TimeRangeSchema).optional(),
    tags: z.array(z.string()).optional(),
    scope: z.string().optional(),
    forward_to_replicas: z.boolean().optional().describe('Whether changes are applied to replica indices.')
});

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    task_id: z.number().describe('Unique identifier of the asynchronous task.'),
    updated_at: z.string().describe('Date and time when the rule was updated, in RFC 3339 format.')
});

const action = createAction({
    description: 'Update a query rule in an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['editSettings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/save-rule
            endpoint: `/1/indexes/${encodeURIComponent(input.index_name)}/rules/${encodeURIComponent(input.object_id)}`,
            params: {
                ...(input.forward_to_replicas !== undefined && { forwardToReplicas: String(input.forward_to_replicas) })
            },
            data: {
                objectID: input.object_id,
                consequence: input.consequence,
                ...(input.conditions !== undefined && { conditions: input.conditions }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.enabled !== undefined && { enabled: input.enabled }),
                ...(input.validity !== undefined && { validity: input.validity }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.scope !== undefined && { scope: input.scope })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            task_id: providerResponse.taskID,
            updated_at: providerResponse.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
