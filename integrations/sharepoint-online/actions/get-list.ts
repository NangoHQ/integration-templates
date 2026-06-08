import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,abc123,def456"'),
    listId: z.string().describe('SharePoint list ID. Example: "12345678-1234-1234-1234-123456789012"')
});

const ProviderListSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    webUrl: z.string().optional().nullable(),
    createdDateTime: z.string().optional().nullable(),
    lastModifiedDateTime: z.string().optional().nullable(),
    list: z
        .object({
            template: z.string().optional().nullable(),
            contentTypesEnabled: z.boolean().optional().nullable(),
            hidden: z.boolean().optional().nullable()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    template: z.string().optional(),
    contentTypesEnabled: z.boolean().optional(),
    hidden: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a SharePoint list by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-list'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/list-get
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found'
            });
        }

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            ...(providerList.displayName !== undefined && { displayName: providerList.displayName }),
            ...(providerList.description != null && { description: providerList.description }),
            ...(providerList.name != null && { name: providerList.name }),
            ...(providerList.webUrl != null && { webUrl: providerList.webUrl }),
            ...(providerList.createdDateTime != null && { createdDateTime: providerList.createdDateTime }),
            ...(providerList.lastModifiedDateTime != null && { lastModifiedDateTime: providerList.lastModifiedDateTime }),
            ...(providerList.list?.template != null && { template: providerList.list.template }),
            ...(providerList.list?.contentTypesEnabled != null && { contentTypesEnabled: providerList.list.contentTypesEnabled }),
            ...(providerList.list?.hidden != null && { hidden: providerList.list.hidden })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
