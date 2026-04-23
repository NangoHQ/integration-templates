import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    purchaseOrderId: z.string().uuid().describe('The unique identifier of the purchase order to retrieve. Example: "8fecd03b-d211-491a-a3bb-7203920abac7"')
});

const ContactSchema = z
    .object({
        ContactID: z.union([z.string(), z.null()]),
        Name: z.union([z.string(), z.null()])
    })
    .passthrough();

const LineItemSchema = z
    .object({
        LineItemID: z.union([z.string(), z.null()]).optional(),
        Description: z.union([z.string(), z.null()]).optional(),
        Quantity: z.union([z.number(), z.null()]).optional(),
        UnitAmount: z.union([z.number(), z.null()]).optional(),
        AccountCode: z.union([z.string(), z.null()]).optional(),
        TaxType: z.union([z.string(), z.null()]).optional(),
        LineAmount: z.union([z.number(), z.null()]).optional()
    })
    .passthrough();

const PurchaseOrderSchema = z
    .object({
        PurchaseOrderID: z.string(),
        PurchaseOrderNumber: z.union([z.string(), z.null()]).optional(),
        Contact: ContactSchema.optional(),
        Date: z.union([z.string(), z.null()]).optional(),
        DeliveryDate: z.union([z.string(), z.null()]).optional(),
        ExpectedArrivalDate: z.union([z.string(), z.null()]).optional(),
        Status: z.union([z.string(), z.null()]).optional(),
        Reference: z.union([z.string(), z.null()]).optional(),
        CurrencyCode: z.union([z.string(), z.null()]).optional(),
        CurrencyRate: z.union([z.number(), z.null()]).optional(),
        SubTotal: z.union([z.number(), z.null()]).optional(),
        TotalTax: z.union([z.number(), z.null()]).optional(),
        Total: z.union([z.number(), z.null()]).optional(),
        LineAmountTypes: z.union([z.string(), z.null()]).optional(),
        LineItems: z.array(LineItemSchema).optional(),
        UpdatedDateUTC: z.union([z.string(), z.null()]).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    purchaseOrder: z.union([PurchaseOrderSchema, z.null()]).optional()
});

const action = createAction({
    description: 'Retrieve a purchase order by PurchaseOrderID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
            const configValue = connection.connection_config['tenant_id'];
            if (typeof configValue === 'string') {
                tenantId = configValue;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
            const metadataValue = connection.metadata['tenantId'];
            if (typeof metadataValue === 'string') {
                tenantId = metadataValue;
            }
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview#get-connections
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (connectionsData && Array.isArray(connectionsData) && connectionsData.length > 0) {
                if (connectionsData.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
                const firstConnection = connectionsData[0];
                if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                    const firstTenantId = firstConnection['tenantId'];
                    if (typeof firstTenantId === 'string') {
                        tenantId = firstTenantId;
                    }
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Unable to resolve xero-tenant-id. Please configure tenant_id in connection_config or tenantId in metadata.'
            });
        }

        const config = {
            // https://developer.xero.com/documentation/api/accounting/purchaseorders
            endpoint: `api.xro/2.0/PurchaseOrders/${input.purchaseOrderId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Purchase order with ID ${input.purchaseOrderId} not found`,
                purchaseOrderId: input.purchaseOrderId
            });
        }

        const responseData = response.data;
        let purchaseOrder = null;

        if (responseData && typeof responseData === 'object') {
            if ('PurchaseOrders' in responseData) {
                const purchaseOrdersArray = responseData['PurchaseOrders'];
                if (Array.isArray(purchaseOrdersArray) && purchaseOrdersArray.length > 0) {
                    purchaseOrder = purchaseOrdersArray[0];
                }
            } else if ('PurchaseOrder' in responseData) {
                purchaseOrder = responseData['PurchaseOrder'];
            }
        }

        return {
            purchaseOrder: purchaseOrder
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
