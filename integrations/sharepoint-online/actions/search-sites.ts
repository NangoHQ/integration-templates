import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search keyword. Example: "contoso"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderSiteSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search for sites by keyword.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/search-sites',
        group: 'Sites'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/site-search
        const response = await nango.get({
            endpoint: '/v1.0/sites',
            params: {
                search: input.query,
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.value.map((site) => ({
            id: site.id,
            ...(site.name !== undefined && { name: site.name }),
            ...(site.description !== undefined && { description: site.description }),
            ...(site.createdDateTime !== undefined && { createdDateTime: site.createdDateTime }),
            ...(site.lastModifiedDateTime !== undefined && { lastModifiedDateTime: site.lastModifiedDateTime }),
            ...(site.webUrl !== undefined && { webUrl: site.webUrl })
        }));

        let next_cursor: string | undefined;
        if (providerResponse['@odata.nextLink']) {
            const nextLink = providerResponse['@odata.nextLink'];
            const url = new URL(nextLink);
            const skiptoken = url.searchParams.get('$skiptoken');
            if (skiptoken) {
                next_cursor = skiptoken;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
