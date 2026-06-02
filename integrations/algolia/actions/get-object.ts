import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    index_name: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    object_id: z.string().describe('Unique record identifier. Example: "nango-test-obj-get"')
});

const OutputSchema = z
    .object({
        objectID: z.string().describe('Unique record identifier.')
    })
    .passthrough()
    .describe('The requested Algolia record.');

const action = createAction({
    description: 'Retrieve a single object from an Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-object',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/get-object
            endpoint: `/1/indexes/${encodeURIComponent(input.index_name)}/${encodeURIComponent(input.object_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Object not found',
                index_name: input.index_name,
                object_id: input.object_id
            });
        }

        const providerObject = OutputSchema.parse(response.data);

        return providerObject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
