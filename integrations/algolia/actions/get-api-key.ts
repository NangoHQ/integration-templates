import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    key: z.string().describe('Algolia API key to retrieve. Example: "59d374984024673eb90738474aa4e9c2"')
});

const ProviderApiKeySchema = z
    .object({
        value: z.string(),
        createdAt: z.number().optional(),
        acl: z.array(z.string()).optional(),
        description: z.string().optional(),
        indexes: z.array(z.string()).optional(),
        maxHitsPerQuery: z.number().optional(),
        maxQueriesPerIPPerHour: z.number().optional(),
        queryParameters: z.string().optional(),
        referers: z.array(z.string()).optional(),
        validity: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    value: z.string(),
    createdAt: z.number().optional(),
    acl: z.array(z.string()).optional(),
    description: z.string().optional(),
    indexes: z.array(z.string()).optional(),
    maxHitsPerQuery: z.number().optional(),
    maxQueriesPerIPPerHour: z.number().optional(),
    queryParameters: z.string().optional(),
    referers: z.array(z.string()).optional(),
    validity: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single API key from Algolia.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#get-key
            endpoint: `/1/keys/${encodeURIComponent(input.key)}`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerKey = ProviderApiKeySchema.parse(response.data);

        return {
            value: providerKey.value,
            ...(providerKey.createdAt !== undefined && { createdAt: providerKey.createdAt }),
            ...(providerKey.acl !== undefined && { acl: providerKey.acl }),
            ...(providerKey.description !== undefined && { description: providerKey.description }),
            ...(providerKey.indexes !== undefined && { indexes: providerKey.indexes }),
            ...(providerKey.maxHitsPerQuery !== undefined && { maxHitsPerQuery: providerKey.maxHitsPerQuery }),
            ...(providerKey.maxQueriesPerIPPerHour !== undefined && { maxQueriesPerIPPerHour: providerKey.maxQueriesPerIPPerHour }),
            ...(providerKey.queryParameters !== undefined && { queryParameters: providerKey.queryParameters }),
            ...(providerKey.referers !== undefined && { referers: providerKey.referers }),
            ...(providerKey.validity !== undefined && { validity: providerKey.validity })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
