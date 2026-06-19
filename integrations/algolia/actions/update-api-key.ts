import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    key: z.string().describe('API key to update. Example: "13ad45b4d0a2f6ea65ecbddf6aa260f2"'),
    acl: z.array(z.string()).describe('Permissions that determine the type of API requests this key can make.'),
    description: z.string().optional().describe('Description of an API key.'),
    indexes: z.array(z.string()).optional().describe('Index names or patterns that this API key can access.'),
    maxHitsPerQuery: z.number().optional().describe('Maximum number of results this API key can retrieve in one query.'),
    maxQueriesPerIPPerHour: z.number().optional().describe('Maximum number of API requests allowed per IP address per hour.'),
    queryParameters: z.string().optional().describe('Query parameters to add when making API requests with this API key.'),
    referers: z.array(z.string()).optional().describe('Allowed HTTP referrers for this API key.'),
    validity: z.number().optional().describe('Duration (in seconds) after which the API key expires.')
});

const OutputSchema = z.object({
    key: z.string(),
    updatedAt: z.string()
});

const action = createAction({
    description: 'Update an API key in Algolia.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#tag/Api-Keys/operation/updateApiKey
            endpoint: `/1/keys/${encodeURIComponent(input.key)}`,
            data: {
                acl: input.acl,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.indexes !== undefined && { indexes: input.indexes }),
                ...(input.maxHitsPerQuery !== undefined && { maxHitsPerQuery: input.maxHitsPerQuery }),
                ...(input.maxQueriesPerIPPerHour !== undefined && { maxQueriesPerIPPerHour: input.maxQueriesPerIPPerHour }),
                ...(input.queryParameters !== undefined && { queryParameters: input.queryParameters }),
                ...(input.referers !== undefined && { referers: input.referers }),
                ...(input.validity !== undefined && { validity: input.validity })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                key: z.string(),
                updatedAt: z.string()
            })
            .parse(response.data);

        return {
            key: providerResponse.key,
            updatedAt: providerResponse.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
