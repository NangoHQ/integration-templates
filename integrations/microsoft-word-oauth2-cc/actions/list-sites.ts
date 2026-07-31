import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query. Use "*" for a broad listing of all accessible sites.'),
    cursor: z.string().url().optional().describe('Pagination cursor from the previous response nextLink field.')
});

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    webUrl: z.string().optional().nullable(),
    description: z.string().optional().nullable()
});

const SiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    sites: z.array(SiteSchema),
    nextLink: z.string().optional().describe('URL to retrieve the next page of results.')
});

const action = createAction({
    description: 'Search/list SharePoint sites accessible to the app',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = '/v1.0/sites';
        const params: Record<string, string> = {};

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            if (cursorUrl.pathname !== endpoint) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a nextLink returned by this same action'
                });
            }
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            params['search'] = input.query || '*';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/site-search
            endpoint,
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            value: z.array(z.unknown()),
            '@odata.nextLink': z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const sites = providerResponse.value.map((item) => {
            const site = ProviderSiteSchema.parse(item);

            return {
                id: site.id,
                ...(site.name != null && { name: site.name }),
                ...(site.displayName != null && { displayName: site.displayName }),
                ...(site.webUrl != null && { webUrl: site.webUrl }),
                ...(site.description != null && { description: site.description })
            };
        });

        return {
            sites,
            ...(providerResponse['@odata.nextLink'] != null && { nextLink: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
