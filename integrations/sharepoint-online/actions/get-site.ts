import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        siteId: z
            .string()
            .optional()
            .describe('SharePoint site ID. Example: "contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D224884-BFCC-4BE3-A6D9-B8C87A8A1234"'),
        hostname: z.string().optional().describe('SharePoint hostname. Example: "contoso.sharepoint.com"'),
        path: z.string().optional().describe('Server-relative URL path of the site. Example: "/sites/hr"')
    })
    .refine((data) => Boolean(data.siteId) || (Boolean(data.hostname) && Boolean(data.path)), {
        message: 'Either siteId or both hostname and path must be provided'
    });

const SiteCollectionSchema = z
    .object({
        hostname: z.string().optional()
    })
    .optional();

const ProviderSiteSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        webUrl: z.string().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        siteCollection: SiteCollectionSchema,
        error: z
            .object({
                code: z.string(),
                message: z.string()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        webUrl: z.string().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        siteCollection: SiteCollectionSchema
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a SharePoint site by ID or path.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-site'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        if (input.siteId) {
            endpoint = `/v1.0/sites/${encodeURIComponent(input.siteId)}`;
        } else if (input.hostname && input.path) {
            endpoint = `/v1.0/sites/${encodeURIComponent(input.hostname)}:${encodeURIComponent(input.path)}`;
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either siteId or both hostname and path must be provided'
            });
        }

        // https://learn.microsoft.com/graph/api/site-get
        const response = await nango.get({
            endpoint: endpoint,
            retries: 3
        });

        const providerSite = ProviderSiteSchema.parse(response.data);

        if (providerSite.error) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerSite.error.message,
                code: providerSite.error.code
            });
        }

        return OutputSchema.parse(providerSite);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
