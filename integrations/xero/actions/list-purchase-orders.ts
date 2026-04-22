import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Example: 1'),
    where: z.string().optional().describe('Xero where clause for filtering. Example: \'Status == "DRAFT"\''),
    if_modified_since: z.string().optional().describe('ISO 8601 timestamp to filter records modified since. Example: "2024-01-01T00:00:00Z"')
});

const PurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    Reference: z.string().optional(),
    AttentionTo: z.string().optional(),
    Telephone: z.string().optional(),
    DeliveryInstructions: z.string().optional(),
    Status: z.string(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    TotalDiscount: z.number().optional(),
    HasAttachments: z.boolean().optional(),
    IsDiscounted: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    Contact: z.record(z.string(), z.unknown()).optional(),
    LineItems: z.array(z.record(z.string(), z.unknown())).optional(),
    DeliveryAddress: z.string().optional()
});

const OutputSchema = z.object({
    purchase_orders: z.array(PurchaseOrderSchema),
    next_cursor: z.string().nullable().describe('Pagination cursor for next page. Null if no more pages.')
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<{ connection_config?: Record<string, unknown>; metadata?: Record<string, unknown> | null }>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const connection = await nango.getConnection();

    // 1. Check connection_config['tenant_id'] - preferred for single-tenant connections
    if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
        const tenantId = connection.connection_config['tenant_id'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    // 2. Check metadata['tenantId'] - set externally by get-tenants action for multi-tenant users
    if (connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
        const tenantId = connection.metadata['tenantId'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    // 3. Call GET connections and use first tenant only if exactly one exists
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connectionsData = connectionsResponse.data;

    if (!connectionsData || !Array.isArray(connectionsData) || connectionsData.length === 0) {
        throw new Error('No Xero tenants found. Please connect a Xero organization.');
    }

    if (connectionsData.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const tenantId = connectionsData[0]['tenantId'];
    if (typeof tenantId !== 'string') {
        throw new Error('Invalid tenantId returned from Xero connections API.');
    }

    return tenantId;
}

const action = createAction({
    description: 'List purchase orders with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-purchase-orders',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read', 'accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const params: Record<string, string | number | string[] | number[]> = {};

        if (input['page'] !== undefined) {
            params['page'] = input['page'];
        }

        if (input['where'] !== undefined && input['where'] !== '') {
            params['where'] = input['where'];
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input['if_modified_since'] !== undefined && input['if_modified_since'] !== '') {
            headers['If-Modified-Since'] = input['if_modified_since'];
        }

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.get({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            params,
            headers,
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: expected object'
            });
        }

        const rawPurchaseOrders = responseData['PurchaseOrders'];

        if (!Array.isArray(rawPurchaseOrders)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: PurchaseOrders is not an array'
            });
        }

        // Map and validate each purchase order
        const purchaseOrders = rawPurchaseOrders
            .filter((po) => po && typeof po === 'object' && typeof po['PurchaseOrderID'] === 'string' && typeof po['Status'] === 'string')
            .map((po) => ({
                PurchaseOrderID: po['PurchaseOrderID'],
                PurchaseOrderNumber: typeof po['PurchaseOrderNumber'] === 'string' ? po['PurchaseOrderNumber'] : undefined,
                Date: typeof po['Date'] === 'string' ? po['Date'] : undefined,
                DeliveryDate: typeof po['DeliveryDate'] === 'string' ? po['DeliveryDate'] : undefined,
                ExpectedArrivalDate: typeof po['ExpectedArrivalDate'] === 'string' ? po['ExpectedArrivalDate'] : undefined,
                Reference: typeof po['Reference'] === 'string' ? po['Reference'] : undefined,
                AttentionTo: typeof po['AttentionTo'] === 'string' ? po['AttentionTo'] : undefined,
                Telephone: typeof po['Telephone'] === 'string' ? po['Telephone'] : undefined,
                DeliveryInstructions: typeof po['DeliveryInstructions'] === 'string' ? po['DeliveryInstructions'] : undefined,
                Status: po['Status'],
                CurrencyCode: typeof po['CurrencyCode'] === 'string' ? po['CurrencyCode'] : undefined,
                CurrencyRate: typeof po['CurrencyRate'] === 'number' ? po['CurrencyRate'] : undefined,
                SubTotal: typeof po['SubTotal'] === 'number' ? po['SubTotal'] : undefined,
                TotalTax: typeof po['TotalTax'] === 'number' ? po['TotalTax'] : undefined,
                Total: typeof po['Total'] === 'number' ? po['Total'] : undefined,
                TotalDiscount: typeof po['TotalDiscount'] === 'number' ? po['TotalDiscount'] : undefined,
                HasAttachments: typeof po['HasAttachments'] === 'boolean' ? po['HasAttachments'] : undefined,
                IsDiscounted: typeof po['IsDiscounted'] === 'boolean' ? po['IsDiscounted'] : undefined,
                UpdatedDateUTC: typeof po['UpdatedDateUTC'] === 'string' ? po['UpdatedDateUTC'] : undefined,
                Contact: po['Contact'] && typeof po['Contact'] === 'object' ? po['Contact'] : undefined,
                LineItems: Array.isArray(po['LineItems']) ? po['LineItems'] : undefined,
                DeliveryAddress: typeof po['DeliveryAddress'] === 'string' ? po['DeliveryAddress'] : undefined
            }));

        // Xero uses page-based pagination; next page exists if we got a full page
        const nextCursor = rawPurchaseOrders.length === 100 && input['page'] !== undefined ? String(input['page'] + 1) : null;

        return {
            purchase_orders: purchaseOrders,
            next_cursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
