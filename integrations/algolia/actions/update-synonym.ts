import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier of the synonym object. Example: "nango-test-syn-update-1"'),
    type: z.enum(['synonym', 'oneWaySynonym', 'altCorrection1', 'altCorrection2', 'placeholder']).describe('Type of synonym'),
    synonyms: z.array(z.string()).optional().describe('Words or phrases considered equivalent (for synonym type)'),
    input: z.string().optional().describe('Word or phrase to appear in query strings (for oneWaySynonym type)'),
    word: z.string().optional().describe('Word or phrase to appear in query strings (for altCorrection1/2 types)'),
    corrections: z.array(z.string()).optional().describe('Words to be matched in records (for altCorrection1/2 types)'),
    placeholder: z.string().optional().describe('Placeholder token (for placeholder type)'),
    replacements: z.array(z.string()).optional().describe('Query words that will match the placeholder token (for placeholder type)'),
    forwardToReplicas: z.boolean().optional().describe('Replicate the updated synonym to all replica indices')
});

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
        const body: Record<string, unknown> = {
            objectID: input.objectID,
            type: input.type
        };

        if (input['synonyms'] !== undefined) {
            body['synonyms'] = input['synonyms'];
        }
        if (input['input'] !== undefined) {
            body['input'] = input['input'];
        }
        if (input['word'] !== undefined) {
            body['word'] = input['word'];
        }
        if (input['corrections'] !== undefined) {
            body['corrections'] = input['corrections'];
        }
        if (input['placeholder'] !== undefined) {
            body['placeholder'] = input['placeholder'];
        }
        if (input['replacements'] !== undefined) {
            body['replacements'] = input['replacements'];
        }

        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#tag/Synonyms/operation/saveSynonym
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`,
            params: {
                ...(input['forwardToReplicas'] !== undefined && { forwardToReplicas: String(input['forwardToReplicas']) })
            },
            data: body,
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
