import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const BaseSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier for the synonym. Example: "nango-test-syn-create-1"')
});

const InputSchema = z.discriminatedUnion('type', [
    BaseSchema.extend({
        type: z.literal('synonym'),
        synonyms: z.array(z.string()).describe('Equivalent terms. Example: ["tv", "television"]')
    }),
    BaseSchema.extend({
        type: z.literal('oneWaySynonym'),
        input: z.string().describe('Input term. Example: "iphone"'),
        synonyms: z.array(z.string()).describe('One-way synonym targets. Example: ["apple phone", "smartphone"]')
    }),
    BaseSchema.extend({
        type: z.literal('altCorrection1'),
        word: z.string().describe('Word to correct. Example: "abdomen"'),
        corrections: z.array(z.string()).describe('Corrections. Example: ["stomach", "belly"]')
    }),
    BaseSchema.extend({
        type: z.literal('altCorrection2'),
        word: z.string().describe('Word to correct. Example: "abdomen"'),
        corrections: z.array(z.string()).describe('Corrections. Example: ["stomach", "belly"]')
    }),
    BaseSchema.extend({
        type: z.literal('placeholder'),
        placeholder: z.string().describe('Placeholder token. Example: "<BRAND>"'),
        replacements: z.array(z.string()).describe('Replacement words. Example: ["Apple", "Samsung"]')
    })
]);

const ProviderResponseSchema = z.object({
    id: z.string(),
    taskID: z.number(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    taskID: z.number(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a synonym in an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['editSettings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { indexName, objectID, ...fields } = input;

        const config: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#tag/Synonyms/operation/saveSynonym
            endpoint: `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectID)}`,
            data: { objectID, ...fields },
            retries: 3
        };

        const response = await nango.put(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            taskID: providerResponse.taskID,
            updatedAt: providerResponse.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
