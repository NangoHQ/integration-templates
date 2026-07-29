import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query to filter SharePoint sites. Example: "nango"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (the @odata.nextLink URL). Omit for the first page.')
});

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional(),
    siteCollection: z
        .object({
            hostname: z.string().nullable().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderSiteSchema),
    '@odata.nextLink': z.string().nullable().optional()
});

const SiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    siteCollection: z
        .object({
            hostname: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    sites: z.array(SiteSchema),
    next_cursor: z.string().optional().describe('URL to fetch the next page of results. Pass this value back as the cursor input.')
});

const action = createAction({
    description: 'Search/list SharePoint sites accessible to the app.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/v1.0/sites';
        const params: Record<string, string> = {};

        if (input.cursor) {
            let cursorUrl: URL;
            // @allowTryCatch - Convert an invalid user-supplied cursor into a structured ActionError instead of an unhandled exception.
            try {
                cursorUrl = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The provided cursor is not a valid URL.'
                });
            }
            if (cursorUrl.hostname !== 'graph.microsoft.com' || cursorUrl.pathname !== '/v1.0/sites') {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The provided cursor does not point to the expected Microsoft Graph sites pagination route.'
                });
            }
            endpoint = cursorUrl.pathname;
            for (const [key, value] of cursorUrl.searchParams) {
                params[key] = value;
            }
        } else if (input.query) {
            params['search'] = input.query;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/site-search
            endpoint,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            sites: providerResponse.value.map((site) => ({
                id: site.id,
                ...(site.name != null && { name: site.name }),
                ...(site.displayName != null && { displayName: site.displayName }),
                ...(site.webUrl != null && { webUrl: site.webUrl }),
                ...(site.description != null && { description: site.description }),
                ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                ...(site.siteCollection != null && {
                    siteCollection: {
                        ...(site.siteCollection.hostname != null && { hostname: site.siteCollection.hostname })
                    }
                })
            })),
            ...(providerResponse['@odata.nextLink'] != null && { next_cursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
