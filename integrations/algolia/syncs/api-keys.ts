import { createSync } from 'nango';
import { z } from 'zod';

const ApiKeySchema = z.object({
    id: z.string(),
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

const ListApiKeysResponseSchema = z.object({
    keys: z.array(
        z.object({
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
        })
    )
});

const sync = createSync({
    description: 'Sync API keys from Algolia.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/api-keys',
            method: 'GET'
        }
    ],
    models: {
        ApiKey: ApiKeySchema
    },

    exec: async (nango) => {
        // Blocker: Algolia's GET /1/keys endpoint returns all keys in a single
        // response with no pagination, no time-based filter, no cursor, and
        // no changed-records endpoint.
        await nango.trackDeletesStart('ApiKey');

        // https://www.algolia.com/doc/rest-api/search/list-api-keys
        const response = await nango.get({
            endpoint: '/1/keys',
            retries: 3
        });

        const parsed = ListApiKeysResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid API key list response: ${parsed.error.message}`);
        }

        const apiKeys = parsed.data.keys.map((key) => ({
            id: key.value,
            value: key.value,
            createdAt: key.createdAt,
            acl: key.acl,
            ...(key.description !== undefined && { description: key.description }),
            ...(key.indexes !== undefined && { indexes: key.indexes }),
            ...(key.maxHitsPerQuery !== undefined && { maxHitsPerQuery: key.maxHitsPerQuery }),
            ...(key.maxQueriesPerIPPerHour !== undefined && { maxQueriesPerIPPerHour: key.maxQueriesPerIPPerHour }),
            ...(key.queryParameters !== undefined && { queryParameters: key.queryParameters }),
            ...(key.referers !== undefined && { referers: key.referers }),
            ...(key.validity !== undefined && { validity: key.validity })
        }));

        if (apiKeys.length > 0) {
            await nango.batchSave(apiKeys, 'ApiKey');
        }

        await nango.trackDeletesEnd('ApiKey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
