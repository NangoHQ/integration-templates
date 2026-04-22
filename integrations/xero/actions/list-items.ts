import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "2"'),
    modified_since: z.string().optional().describe('Filter items modified since this date (ISO 8601 format). Example: "2024-01-01T00:00:00"')
});

const ItemSchema = z.object({
    id: z.string(),
    code: z.union([z.string(), z.null()]),
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    is_sold: z.union([z.boolean(), z.null()]),
    is_purchased: z.union([z.boolean(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const ConnectionsResponseSchema = z.object({
    data: z.array(
        z.object({
            tenantId: z.string()
        })
    )
});

const ItemsResponseSchema = z.object({
    Items: z
        .array(
            z.object({
                ItemID: z.string(),
                Code: z.union([z.string(), z.null()]).optional(),
                Name: z.union([z.string(), z.null()]).optional(),
                Description: z.union([z.string(), z.null()]).optional(),
                IsSold: z.union([z.boolean(), z.null()]).optional(),
                IsPurchased: z.union([z.boolean(), z.null()]).optional(),
                Type: z.union([z.string(), z.null()]).optional(),
                Status: z.union([z.string(), z.null()]).optional()
            })
        )
        .optional(),
    pagination: z
        .object({
            page: z.number(),
            pageSize: z.number(),
            pageCount: z.number(),
            itemCount: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'List items with optional filtering.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-items',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection && typeof connection === 'object') {
            const connectionConfig = connection['connection_config'];
            if (connectionConfig && typeof connectionConfig === 'object') {
                const tenantIdValue = connectionConfig['tenant_id'];
                if (typeof tenantIdValue === 'string') {
                    tenantId = tenantIdValue;
                }
            }

            if (!tenantId) {
                const metadata = connection['metadata'];
                if (metadata && typeof metadata === 'object') {
                    const tenantIdValue = metadata['tenantId'];
                    if (typeof tenantIdValue === 'string') {
                        tenantId = tenantIdValue;
                    }
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/connections/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success || !parsedConnections.data.data || parsedConnections.data.data.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant_found',
                    message: 'No Xero tenants found. Please connect a Xero organization.'
                });
            }

            const connectionsList = parsedConnections.data.data;
            if (connectionsList.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsList[0];
            if (firstConnection) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant_id',
                message: 'Could not resolve tenant ID'
            });
        }

        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(pageNumber) || pageNumber < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor value. Must be a positive integer.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.modified_since) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            headers: headers,
            params: {
                page: pageNumber.toString()
            },
            retries: 3
        });

        const parsedResponse = ItemsResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse items response from Xero API'
            });
        }

        const items = parsedResponse.data.Items || [];
        const pagination = parsedResponse.data.pagination;

        const mappedItems = items.map((item) => ({
            id: item.ItemID,
            code: item.Code ?? null,
            name: item.Name ?? null,
            description: item.Description ?? null,
            is_sold: item.IsSold ?? null,
            is_purchased: item.IsPurchased ?? null,
            type: item.Type ?? null,
            status: item.Status ?? null
        }));

        let nextCursor: string | null = null;
        if (pagination && pagination.page < pagination.pageCount) {
            nextCursor = (pagination.page + 1).toString();
        }

        return {
            items: mappedItems,
            next_cursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
