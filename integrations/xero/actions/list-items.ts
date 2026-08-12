import { z } from 'zod';
import { createAction } from 'nango';

const PurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for purchase transactions.'),
    AccountCode: z.string().optional().describe('Default account code for purchases. Not applicable to tracked items.'),
    COGSAccountCode: z.string().optional().describe('Cost of goods sold account code. Only applicable to tracked items.'),
    TaxType: z.string().optional().describe('Tax type override for purchases.')
});

const SalesDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for sales transactions.'),
    AccountCode: z.string().optional().describe('Default account code for sales.'),
    TaxType: z.string().optional().describe('Tax type override for sales.')
});

const ItemSchema = z.object({
    ItemID: z.string().describe('Xero-generated unique identifier for the item.'),
    Code: z.string().describe('User-defined item code.'),
    Name: z.string().optional().describe('The name of the item.'),
    Description: z.string().optional().describe('The sales description of the item.'),
    PurchaseDescription: z.string().optional().describe('The purchase description of the item.'),
    IsSold: z.boolean().optional().describe('Whether the item is available on sales transactions.'),
    IsPurchased: z.boolean().optional().describe('Whether the item is available on purchase transactions.'),
    IsTrackedAsInventory: z.boolean().optional().describe('Whether Xero tracks quantity on hand and value for this item.'),
    InventoryAssetAccountCode: z.string().optional().describe('Account code for inventory asset. Only for tracked items.'),
    TotalCostPool: z.number().optional().describe('Total cost pool for tracked inventory items.'),
    QuantityOnHand: z.number().optional().describe('Quantity of the item currently on hand.'),
    QuantityAvailable: z.number().optional().describe('Quantity available (on hand minus back order).'),
    QuantityOnBackOrder: z.number().optional().describe('Quantity currently on back order.'),
    UpdatedDateUTC: z.string().optional().describe('Last modified date in UTC format.'),
    PurchaseDetails: PurchaseDetailsSchema.optional().describe('Default purchase details for the item.'),
    SalesDetails: SalesDetailsSchema.optional().describe('Default sales details for the item.')
});

const InputSchema = z
    .object({
        modified_since: z.string().optional().describe('UTC timestamp (ISO 8601) to filter items modified since this time. Sets the If-Modified-Since header.'),
        page: z.number().optional().describe('Page number for paginated results. Defaults to 1.'),
        page_size: z.number().optional().describe('Number of items per page. Defaults to 100, maximum 1000.')
    })
    .describe('Input for listing Xero items with optional filtering and pagination.');

const OutputSchema = z
    .object({
        items: z.array(ItemSchema).describe('Array of items returned from Xero.'),
        next_page: z.number().optional().describe('Next page number if more results are available.'),
        page: z.number().optional().describe('Current page number.'),
        page_size: z.number().optional().describe('Number of items requested per page.'),
        total_count: z.number().optional().describe('Total number of items matching the query.')
    })
    .describe('Output containing a paginated list of Xero items.');

const ConnectionSchema = z.object({
    connection_config: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
    metadata: z.union([z.record(z.string(), z.unknown()), z.null()]).optional()
});

const ConnectionsResponseSchema = z.array(z.record(z.string(), z.unknown()));

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of items from the Xero Accounting API without modifying provider data.
 * @pitfalls: PurchaseDetails and SalesDetails can be returned as empty objects {} rather than omitted when unset; If-Modified-Since filtering may miss changes that do not update the UpdatedDateUTC timestamp. The Items endpoint does not support paging (no page/pageSize params and no pagination object in the response), so the page and page_size inputs and the next_page/page/page_size output fields never take effect — Xero always returns the full item list in a single call.
 */
const action = createAction({
    description: 'List items with optional filtering.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices', 'accounting.invoices.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResponse = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResponse);

        let tenantId: string | undefined;

        if (
            connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string' && connection.metadata['tenantId'].length > 0) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResp = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connections = ConnectionsResponseSchema.parse(connectionsResp.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connections[0];
            if (typeof first === 'object' && first !== null && typeof first['tenantId'] === 'string' && first['tenantId'].length > 0) {
                tenantId = first['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.modified_since) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.page_size !== undefined) {
            params['pageSize'] = input.page_size;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            headers,
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Xero Items API.'
            });
        }

        const rawData = Object.fromEntries(Object.entries(response.data));

        if (!Array.isArray(rawData['Items'])) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Items array missing in Xero response.'
            });
        }

        const items = rawData['Items'].map((item: unknown) => ItemSchema.parse(item));

        let nextPage: number | undefined;
        let page: number | undefined;
        let pageSize: number | undefined;
        let totalCount: number | undefined;

        const pagination = rawData['pagination'];
        if (pagination !== null && typeof pagination === 'object' && !Array.isArray(pagination)) {
            const p = Object.fromEntries(Object.entries(pagination));
            if (typeof p['page'] === 'number') {
                page = p['page'];
            }
            if (typeof p['pageSize'] === 'number') {
                pageSize = p['pageSize'];
            }
            if (typeof p['itemCount'] === 'number') {
                totalCount = p['itemCount'];
            }
            if (typeof p['pageCount'] === 'number' && typeof page === 'number' && page < p['pageCount']) {
                nextPage = page + 1;
            }
        }

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage }),
            ...(page !== undefined && { page }),
            ...(pageSize !== undefined && { page_size: pageSize }),
            ...(totalCount !== undefined && { total_count: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
