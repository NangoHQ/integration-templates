import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"')
});

const ProviderSettingsSchema = z.object({}).passthrough();

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve Algolia index settings.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-settings',
        group: 'Settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/#get-settings
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/settings`,
            retries: 3
        });

        const providerSettings = ProviderSettingsSchema.parse(response.data);

        return providerSettings;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
