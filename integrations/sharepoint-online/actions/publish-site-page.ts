import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,site-id"'),
    pageId: z.string().describe('Site page ID. Example: "page-id-guid"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    siteId: z.string(),
    pageId: z.string()
});

const action = createAction({
    description: 'Publish a site page.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/publish-site-page',
        group: 'Site Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedSiteId = encodeURIComponent(input.siteId);
        const encodedPageId = encodeURIComponent(input.pageId);

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/sitepage-publish
            endpoint: `/v1.0/sites/${encodedSiteId}/pages/${encodedPageId}/microsoft.graph.sitePage/publish`,
            retries: 3
        };

        const response = await nango.post(config);

        if (response.status !== 204 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'publish_failed',
                message: `Page publish failed with status ${response.status}`,
                siteId: input.siteId,
                pageId: input.pageId
            });
        }

        return {
            success: true,
            siteId: input.siteId,
            pageId: input.pageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
