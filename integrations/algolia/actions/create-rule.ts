import { z } from 'zod';
import { createAction } from 'nango';

const ConditionSchema = z
    .object({
        pattern: z.string().describe('Query pattern that triggers the rule. Example: "smartphone"'),
        anchoring: z.string().describe('Which part of the search query the pattern should match. Example: "contains"'),
        alternatives: z.boolean().optional().describe('Whether the pattern should match plurals, synonyms, and typos.'),
        context: z.string().optional().describe('An additional restriction that only triggers the rule when the search has the same ruleContexts value.'),
        filters: z.string().optional().describe('Filters that trigger the rule. Example: "genre:comedy"')
    })
    .passthrough();

const ConsequenceSchema = z
    .object({
        params: z.record(z.string(), z.unknown()).optional().describe('Parameters to apply to this search.'),
        promote: z.array(z.record(z.string(), z.unknown())).optional().describe('Records to pin to a specific position in the search results.'),
        filterPromotes: z.boolean().optional().describe('Whether promoted records must also match active filters.'),
        hide: z.array(z.record(z.string(), z.unknown())).optional().describe('Records to hide from the search results.'),
        redirect: z.record(z.string(), z.unknown()).optional().describe('Redirect to a virtual replica index.'),
        userData: z.record(z.string(), z.unknown()).optional().describe('Custom data appended to the userData array in the response.')
    })
    .passthrough();

const TimeRangeSchema = z.object({
    from: z.number().describe('Timestamp when the rule should start to be active, measured in seconds since the Unix epoch.'),
    until: z.number().describe('Timestamp when the rule should stop to be active, measured in seconds since the Unix epoch.')
});

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier for the rule. Example: "nango-test-rule-create"'),
    conditions: z.array(ConditionSchema).min(1).describe('Conditions that trigger the rule.'),
    consequence: ConsequenceSchema.describe('Effect of the rule.'),
    description: z.string().optional().describe('Description of the rule.'),
    enabled: z.boolean().optional().describe('Whether the rule is active.'),
    validity: z.array(TimeRangeSchema).optional().describe('Time periods when the rule is active.'),
    tags: z.array(z.string()).optional().describe('Tags for the rule.'),
    scope: z.string().optional().describe('Scope of the rule.')
});

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string()
});

const action = createAction({
    description: 'Create a query rule in an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['editSettings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#tag/Rules/operation/saveRule
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/rules/${encodeURIComponent(input.objectID)}`,
            data: {
                objectID: input.objectID,
                conditions: input.conditions,
                consequence: input.consequence,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.enabled !== undefined && { enabled: input.enabled }),
                ...(input.validity !== undefined && { validity: input.validity }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.scope !== undefined && { scope: input.scope })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            updatedAt: providerResponse.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
