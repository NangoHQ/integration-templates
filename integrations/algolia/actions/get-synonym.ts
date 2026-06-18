import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Unique identifier of the synonym object. Example: "nango-test-syn-get"')
});

const SynonymTypeSchema = z.enum([
    'synonym',
    'onewaysynonym',
    'altcorrection1',
    'altcorrection2',
    'placeholder',
    'oneWaySynonym',
    'altCorrection1',
    'altCorrection2'
]);

const ProviderSynonymSchema = z.object({
    objectID: z.string(),
    type: SynonymTypeSchema,
    synonyms: z.array(z.string()).optional(),
    input: z.string().optional(),
    word: z.string().optional(),
    corrections: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    replacements: z.array(z.string()).optional()
});

const OutputSchema = ProviderSynonymSchema;

const action = createAction({
    description: 'Retrieve a single synonym from an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/#tag/Synonyms/operation/getSynonym
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Synonym not found',
                objectID: input.objectID,
                indexName: input.indexName
            });
        }

        const synonym = ProviderSynonymSchema.parse(response.data);

        return synonym;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
