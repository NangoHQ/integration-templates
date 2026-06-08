import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE"'),
    listId: z.string().describe('SharePoint list ID. Example: "243bca4b-4e5e-45af-b37d-25f6135a740d"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    expandFields: z.boolean().optional().describe('Whether to expand the fields property for each list item.'),
    fieldSelectors: z
        .string()
        .optional()
        .describe('Comma-separated column names to select when expanding fields. Requires expandFields to be true. Example: "Name,Color,Quantity"'),
    top: z.number().int().min(1).max(999).optional().describe('Number of items to return per page (1-999).')
});

const ListItemSchema = z.object({
    id: z.string(),
    contentType: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    createdBy: z.record(z.string(), z.unknown()).optional(),
    createdDateTime: z.string().optional(),
    deleted: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    eTag: z.string().optional(),
    lastModifiedBy: z.record(z.string(), z.unknown()).optional(),
    lastModifiedDateTime: z.string().optional(),
    name: z.string().optional(),
    parentReference: z.record(z.string(), z.unknown()).optional(),
    sharepointIds: z.record(z.string(), z.unknown()).optional(),
    webUrl: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ListItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List items in a SharePoint list',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-list-items',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.cursor) {
            const pairs = input.cursor.split('&');
            for (const pair of pairs) {
                const eqIndex = pair.indexOf('=');
                if (eqIndex > 0) {
                    const key = decodeURIComponent(pair.slice(0, eqIndex));
                    const value = decodeURIComponent(pair.slice(eqIndex + 1));
                    params[key] = value;
                } else if (pair.length > 0) {
                    params[decodeURIComponent(pair)] = '';
                }
            }
        }

        if (input.expandFields) {
            if (input.fieldSelectors) {
                params['$expand'] = `fields(select=${input.fieldSelectors})`;
            } else {
                params['$expand'] = 'fields';
            }
        }

        if (input.top !== undefined) {
            params['$top'] = String(input.top);
        }

        // https://learn.microsoft.com/graph/api/listitem-list
        const response = await nango.get({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.value.map((item: unknown) => {
            const parsed = ListItemSchema.safeParse(item);
            if (!parsed.success) {
                if (item !== null && typeof item === 'object' && 'id' in item && (typeof item.id === 'string' || typeof item.id === 'number')) {
                    return { id: String(item.id) };
                }
                return { id: '' };
            }
            return parsed.data;
        });

        let nextCursor: string | undefined;
        const nextLink = providerResponse['@odata.nextLink'];
        if (nextLink) {
            const queryIndex = nextLink.indexOf('?');
            if (queryIndex !== -1) {
                nextCursor = nextLink.slice(queryIndex + 1);
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
