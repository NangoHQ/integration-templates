import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,2c7126d0-5f53-4b7b-9a3e-0b5c2e7d1f3a,1"'),
    pageId: z.string().describe('SharePoint site page ID. Example: "2"')
});

const OutputSchema = z.object({
    siteId: z.string(),
    pageId: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a site page.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-site-page',
        group: 'Site Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://learn.microsoft.com/graph/api/sitepage-delete
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/pages/${encodeURIComponent(input.pageId)}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Unexpected status code ${response.status} when deleting site page.`,
                siteId: input.siteId,
                pageId: input.pageId
            });
        }

        return {
            siteId: input.siteId,
            pageId: input.pageId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
