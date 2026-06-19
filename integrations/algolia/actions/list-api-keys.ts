import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ApiKeySchema = z.object({
    value: z.string(),
    createdAt: z.number(),
    acl: z.array(z.string()),
    description: z.string().optional(),
    indexes: z.array(z.string()).optional(),
    maxHitsPerQuery: z.number().optional(),
    maxQueriesPerIPPerHour: z.number().optional(),
    queryParameters: z.string().optional(),
    referers: z.array(z.string()).optional(),
    validity: z.number().optional()
});

const ProviderResponseSchema = z.object({
    keys: z.array(z.unknown())
});

const OutputSchema = z.object({
    keys: z.array(ApiKeySchema)
});

const action = createAction({
    description: 'List API keys from Algolia.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/list-api-keys
            endpoint: '/1/keys',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const keys = providerResponse.keys.map((item: unknown) => {
            const parsed = ApiKeySchema.parse(item);
            return {
                value: parsed.value,
                createdAt: parsed.createdAt,
                acl: parsed.acl,
                ...(parsed.description !== undefined && { description: parsed.description }),
                ...(parsed.indexes !== undefined && { indexes: parsed.indexes }),
                ...(parsed.maxHitsPerQuery !== undefined && { maxHitsPerQuery: parsed.maxHitsPerQuery }),
                ...(parsed.maxQueriesPerIPPerHour !== undefined && { maxQueriesPerIPPerHour: parsed.maxQueriesPerIPPerHour }),
                ...(parsed.queryParameters !== undefined && { queryParameters: parsed.queryParameters }),
                ...(parsed.referers !== undefined && { referers: parsed.referers }),
                ...(parsed.validity !== undefined && { validity: parsed.validity })
            };
        });

        return {
            keys
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
