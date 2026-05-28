import { z } from 'zod';
import { createAction } from 'nango';

const BaseSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier of the synonym object. Example: "nango-test-syn-update-1"'),
    forwardToReplicas: z.boolean().optional().describe('Replicate the updated synonym to all replica indices')
});

const InputSchema = z.discriminatedUnion('type', [
    BaseSchema.extend({
        type: z.literal('synonym'),
        synonyms: z.array(z.string()).describe('Words or phrases considered equivalent. Example: ["tv", "television"]')
    }),
    BaseSchema.extend({
        type: z.literal('oneWaySynonym'),
        input: z.string().describe('Word or phrase to appear in query strings. Example: "iphone"'),
        synonyms: z.array(z.string()).describe('One-way synonym targets. Example: ["apple phone"]')
    }),
    BaseSchema.extend({
        type: z.literal('altCorrection1'),
        word: z.string().describe('Word or phrase to appear in query strings. Example: "abdomen"'),
        corrections: z.array(z.string()).describe('Words to be matched in records. Example: ["stomach"]')
    }),
    BaseSchema.extend({
        type: z.literal('altCorrection2'),
        word: z.string().describe('Word or phrase to appear in query strings. Example: "abdomen"'),
        corrections: z.array(z.string()).describe('Words to be matched in records. Example: ["stomach"]')
    }),
    BaseSchema.extend({
        type: z.literal('placeholder'),
        placeholder: z.string().describe('Placeholder token. Example: "<BRAND>"'),
        replacements: z.array(z.string()).describe('Query words matching the placeholder. Example: ["Apple"]')
    })
]);

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string(),
    id: z.string()
});

const OutputSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string(),
    id: z.string()
});

const action = createAction({
    description: 'Update a synonym in an Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-synonym',
        group: 'Synonyms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['editSettings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { indexName, objectID, forwardToReplicas, ...fields } = input;

        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#tag/Synonyms/operation/saveSynonym
            endpoint: `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectID)}`,
            params: {
                ...(forwardToReplicas !== undefined && { forwardToReplicas: String(forwardToReplicas) })
            },
            data: { objectID, ...fields },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            updatedAt: providerResponse.updatedAt,
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
