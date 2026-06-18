import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderSiteSchema).optional(),
    '@odata.nextLink': z.string().optional()
});

const SiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const OutputSchema = z.object({
    sites: z.array(SiteSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List SharePoint sites for user selection workflows.',
    version: '4.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/v1.0/sites';

        if (input.cursor) {
            const url = new URL(input.cursor);
            endpoint = url.pathname + url.search;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/site-search
            endpoint,
            ...(input.cursor ? {} : { params: { search: '*' } }),
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            sites:
                providerResponse.value?.map((site) => ({
                    id: site.id,
                    ...(site.name != null && { name: site.name }),
                    ...(site.displayName != null && { displayName: site.displayName }),
                    ...(site.description != null && { description: site.description }),
                    ...(site.webUrl != null && { webUrl: site.webUrl }),
                    ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                    ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime })
                })) ?? [],
            ...(providerResponse['@odata.nextLink'] != null && { nextCursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
