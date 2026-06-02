import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    hitsPerPage: z.number().int().min(1).max(1000).optional().describe('Number of indices to return per page.')
});

const ProviderIndexSchema = z.object({
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    entries: z.number(),
    dataSize: z.number(),
    fileSize: z.number(),
    lastBuildTimeS: z.number(),
    numberOfPendingTasks: z.number(),
    pendingTask: z.boolean(),
    primary: z.string().optional(),
    replicas: z.array(z.string()).optional(),
    virtual: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderIndexSchema),
    nextCursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderIndexSchema),
    nbPages: z.number()
});

const action = createAction({
    description: 'List indices from Algolia.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-indices',
        group: 'Indices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['listIndexes'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(page) || !Number.isInteger(page) || page < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };

        if (input.hitsPerPage !== undefined) {
            params['hitsPerPage'] = input.hitsPerPage;
        }

        const config: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/list-indices/
            endpoint: '/1/indexes',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = page + 1 < providerResponse.nbPages ? String(page + 1) : undefined;

        return {
            items: providerResponse.items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
