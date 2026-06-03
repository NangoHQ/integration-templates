import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,site-id"'),
    listId: z.string().describe('SharePoint list ID. Example: "list-id"'),
    itemId: z.string().describe('SharePoint list item ID. Example: "1"'),
    expandFields: z.boolean().optional().describe('Whether to expand the fields property to include custom column values.')
});

const IdentitySetSchema = z.object({
    user: z
        .object({
            displayName: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const ContentTypeInfoSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ParentReferenceSchema = z.object({
    id: z.string().optional(),
    siteId: z.string().optional()
});

const ProviderListItemSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    createdBy: IdentitySetSchema.optional(),
    lastModifiedBy: IdentitySetSchema.optional(),
    parentReference: ParentReferenceSchema.optional(),
    contentType: ContentTypeInfoSchema.optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    createdBy: IdentitySetSchema.optional(),
    lastModifiedBy: IdentitySetSchema.optional(),
    parentReference: ParentReferenceSchema.optional(),
    contentType: ContentTypeInfoSchema.optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a SharePoint list item by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-list-item',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.expandFields) {
            params['$expand'] = 'fields';
        }

        // https://learn.microsoft.com/graph/api/listitem-get
        const response = await nango.get({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items/${encodeURIComponent(input.itemId)}`,
            params,
            retries: 3
        });

        const providerItem = ProviderListItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            ...(providerItem.createdDateTime !== undefined && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerItem.lastModifiedDateTime }),
            ...(providerItem.webUrl !== undefined && { webUrl: providerItem.webUrl }),
            ...(providerItem.createdBy !== undefined && { createdBy: providerItem.createdBy }),
            ...(providerItem.lastModifiedBy !== undefined && { lastModifiedBy: providerItem.lastModifiedBy }),
            ...(providerItem.parentReference !== undefined && { parentReference: providerItem.parentReference }),
            ...(providerItem.contentType !== undefined && { contentType: providerItem.contentType }),
            ...(providerItem.fields !== undefined && { fields: providerItem.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
