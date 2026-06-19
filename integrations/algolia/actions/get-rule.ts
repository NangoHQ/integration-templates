import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier of the rule. Example: "nango-test-rule-get"')
});

const ConditionSchema = z
    .object({
        pattern: z.string().optional(),
        anchoring: z.string().optional(),
        alternatives: z.boolean().optional(),
        context: z.string().optional(),
        filters: z.string().optional()
    })
    .passthrough();

const TimeRangeSchema = z
    .object({
        from: z.number().optional(),
        until: z.number().optional()
    })
    .passthrough();

const ConsequenceSchema = z
    .object({
        params: z.object({}).passthrough().optional(),
        promote: z.array(z.object({}).passthrough()).optional(),
        filterPromotes: z.boolean().optional(),
        hide: z
            .array(
                z
                    .object({
                        objectID: z.string()
                    })
                    .passthrough()
            )
            .optional(),
        redirect: z
            .object({
                indexName: z.string()
            })
            .passthrough()
            .optional(),
        userData: z.object({}).passthrough().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        objectID: z.string(),
        conditions: z.array(ConditionSchema).optional(),
        consequence: ConsequenceSchema,
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        validity: z.array(TimeRangeSchema).optional(),
        tags: z.array(z.string()).optional(),
        scope: z.string().optional(),
        condition: ConditionSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single query rule from an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.algolia.com/doc/rest-api/search/#get-a-rule
        const response = await nango.get({
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/rules/${encodeURIComponent(input.objectID)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Rule not found',
                objectID: input.objectID,
                indexName: input.indexName
            });
        }

        const providerRule = OutputSchema.parse(response.data);
        return providerRule;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
