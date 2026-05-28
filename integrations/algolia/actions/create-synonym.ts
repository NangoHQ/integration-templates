import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier for the synonym. Example: "nango-test-syn-create-1"'),
    type: z.string().describe('Synonym type. Example: "synonym", "oneWaySynonym", "altCorrection1", "altCorrection2", "placeholder"'),
    synonyms: z.array(z.string()).optional().describe('Array of equivalent terms (for "synonym" and "oneWaySynonym" types)'),
    input: z.string().optional().describe('Input term (for "oneWaySynonym" type)'),
    word: z.string().optional().describe('Word to correct (for "altCorrection1" and "altCorrection2" types)'),
    corrections: z.array(z.string()).optional().describe('Array of corrections (for "altCorrection1" and "altCorrection2" types)'),
    placeholder: z.string().optional().describe('Placeholder token (for "placeholder" type)'),
    replacements: z.array(z.string()).optional().describe('Array of replacement words (for "placeholder" type)')
});

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
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-synonym',
        group: 'Synonyms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['editSettings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            objectID: input['objectID'],
            type: input['type']
        };

        if (input['synonyms'] !== undefined) {
            data['synonyms'] = input['synonyms'];
        }
        if (input['input'] !== undefined) {
            data['input'] = input['input'];
        }
        if (input['word'] !== undefined) {
            data['word'] = input['word'];
        }
        if (input['corrections'] !== undefined) {
            data['corrections'] = input['corrections'];
        }
        if (input['placeholder'] !== undefined) {
            data['placeholder'] = input['placeholder'];
        }
        if (input['replacements'] !== undefined) {
            data['replacements'] = input['replacements'];
        }

        const config: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#tag/Synonyms/operation/saveSynonym
            endpoint: `/1/indexes/${encodeURIComponent(input['indexName'])}/synonyms/${encodeURIComponent(input['objectID'])}`,
            data,
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
