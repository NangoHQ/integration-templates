import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query to filter sites. Example: "nango"')
});

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            createdDateTime: z.string().optional(),
            lastModifiedDateTime: z.string().optional(),
            webUrl: z.string().optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'Search and list SharePoint sites accessible to the app.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.query !== undefined && input.query !== '') {
            params['search'] = input.query;
        }

        // https://learn.microsoft.com/en-us/graph/api/site-search
        const response = await nango.get({
            endpoint: '/v1.0/sites',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(ProviderSiteSchema).optional(),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = (providerResponse.value || []).map((site) => ({
            id: site.id,
            ...(site.name !== undefined && { name: site.name }),
            ...(site.description !== undefined && { description: site.description }),
            ...(site.createdDateTime !== undefined && { createdDateTime: site.createdDateTime }),
            ...(site.lastModifiedDateTime !== undefined && { lastModifiedDateTime: site.lastModifiedDateTime }),
            ...(site.webUrl !== undefined && { webUrl: site.webUrl })
        }));

        return {
            items,
            ...(providerResponse['@odata.nextLink'] !== undefined && {
                nextCursor: providerResponse['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
