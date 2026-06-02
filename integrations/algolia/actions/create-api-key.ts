import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    acl: z.array(z.string()).describe('Permissions that determine the type of API requests this key can make. Example: ["search", "addObject"]'),
    description: z.string().optional().describe('Description of an API key to help you identify this API key. Example: "Used for indexing by the CLI"'),
    indexes: z.array(z.string()).optional().describe('Index names or patterns that this API key can access. Example: ["dev_*", "prod_en_products"]'),
    maxHitsPerQuery: z.number().optional().describe('Maximum number of results this API key can retrieve in one query.'),
    maxQueriesPerIPPerHour: z.number().optional().describe('Maximum number of API requests allowed per IP address or user token per hour.'),
    queryParameters: z
        .string()
        .optional()
        .describe('Query parameters to add when making API requests with this API key. Example: "typoTolerance=strict&restrictSources=192.168.1.0/24"'),
    referers: z.array(z.string()).optional().describe('Allowed HTTP referrers for this API key. Example: ["*algolia.com*"]'),
    validity: z.number().optional().describe('Duration (in seconds) after which the API key expires. Example: 86400')
});

const ProviderResponseSchema = z.object({
    key: z.string(),
    createdAt: z.string()
});

const OutputSchema = z.object({
    key: z.string().describe('The newly created API key. Example: 13ad45b4d0a2f6ea65ecbddf6aa260f2'),
    createdAt: z.string().describe('Date and time when the API key was created, in RFC 3339 format. Example: 2023-07-04T12:49:15Z')
});

const action = createAction({
    description: 'Create an API key in Algolia.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-api-key',
        group: 'Api Keys'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/add-api-key
            endpoint: '/1/keys',
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
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            key: providerResponse.key,
            createdAt: providerResponse.createdAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
