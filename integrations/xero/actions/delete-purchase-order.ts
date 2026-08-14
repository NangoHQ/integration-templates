import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        purchase_order_id: z.string().describe('The Xero PurchaseOrderID of the purchase order to delete. Example: "6827ed90-f3f3-480e-b980-41e15eb1e4a9"')
    })
    .describe('Input to delete a draft or submitted Xero purchase order.');

const OutputSchema = z
    .object({
        purchase_order_id: z.string().describe('The ID of the deleted purchase order.'),
        status: z.string().describe('The resulting status after deletion, typically "DELETED".')
    })
    .describe('Confirmation of the deleted purchase order.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the purchase order status to DELETED on the provider. Only works on DRAFT or SUBMITTED purchase orders.
 * @pitfalls: Only works on DRAFT or SUBMITTED purchase orders; AUTHORISED ones must be voided first. Re-invoking on an already-deleted purchase order returns a provider 400 error. Deleted records remain gettable by ID with Status DELETED and never return 404.
 */
const action = createAction({
    description: 'Delete a draft/submitted purchase order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionData = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
                metadata: z.record(z.string(), z.unknown()).nullable().optional()
            })
            .parse(connection);

        let tenantId: string | undefined;
        if (
            connectionData.connection_config &&
            typeof connectionData.connection_config['tenant_id'] === 'string' &&
            connectionData.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connectionData.connection_config['tenant_id'];
        } else if (connectionData.metadata && typeof connectionData.metadata['tenantId'] === 'string' && connectionData.metadata['tenantId'].length > 0) {
            tenantId = connectionData.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);

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

            const firstConnection = connections[0];
            if (firstConnection && typeof firstConnection['tenantId'] === 'string' && firstConnection['tenantId'].length > 0) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.post({
            endpoint: `api.xro/2.0/PurchaseOrders/${encodeURIComponent(input.purchase_order_id)}`,
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: {
                Status: 'DELETED'
            },
            retries: 10
        });

        const responseData = z
            .object({
                PurchaseOrders: z.array(z.record(z.string(), z.unknown())).optional()
            })
            .parse(response.data);

        if (!responseData.PurchaseOrders || responseData.PurchaseOrders.length === 0) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain PurchaseOrders.'
            });
        }

        const purchaseOrder = responseData.PurchaseOrders[0];
        const purchaseOrderId =
            purchaseOrder && typeof purchaseOrder['PurchaseOrderID'] === 'string' ? purchaseOrder['PurchaseOrderID'] : input.purchase_order_id;
        const status = purchaseOrder && typeof purchaseOrder['Status'] === 'string' ? purchaseOrder['Status'] : 'UNKNOWN';

        return {
            purchase_order_id: purchaseOrderId,
            status: status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
