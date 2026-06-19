import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    q: z.string().describe('SOSL search string. Example: FIND {Acme}'),
    apiVersion: z.string().optional().describe('Salesforce API version. Example: v58.0. Defaults to v58.0')
});

const SearchRecordSchema = z
    .object({
        attributes: z.object({
            type: z.string(),
            url: z.string()
        }),
        Id: z.string()
    })
    .passthrough();

const SearchResultsByObjectSchema = z.record(z.string(), z.array(SearchRecordSchema));

const OutputSchema = z.object({
    searchResults: SearchResultsByObjectSchema,
    totalSize: z.number()
});

const action = createAction({
    description: 'Run a SOSL search across searchable Salesforce objects',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = input.apiVersion || 'v58.0';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_search.htm
        const response = await nango.get({
            endpoint: `/services/data/${encodeURIComponent(version)}/search`,
            params: {
                q: input.q
            },
            retries: 3
        });

        const searchResults = SearchResultsByObjectSchema.parse(response.data);

        let totalSize = 0;
        Object.values(searchResults).forEach((records) => {
            totalSize += records.length;
        });

        return {
            searchResults,
            totalSize
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
