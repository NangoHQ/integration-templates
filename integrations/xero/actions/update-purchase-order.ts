import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    purchase_order_id: z.string().describe('Unique Xero identifier for the purchase order. Example: "8b68b396-8735-4f50-b253-5a3aabe6e0f5"'),
    contact_id: z.string().optional().describe('Optional Contact ID to update. Example: "8b68b396-8735-4f50-b253-5a3aabe6e0f5"'),
    date: z.string().optional().describe('Date of the purchase order in YYYY-MM-DD format. Example: "2025-04-22"'),
    delivery_date: z.string().optional().describe('Expected delivery date in YYYY-MM-DD format. Example: "2025-05-01"'),
    reference: z.string().optional().describe('Reference for the purchase order. Example: "PO-2025-001"'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED', 'DELETED']).optional().describe('Status of the purchase order'),
    line_items: z
        .array(
            z.object({
                description: z.string().describe('Description of the line item. Example: "Widget A"'),
                quantity: z.number().describe('Quantity ordered. Example: 10'),
                unit_amount: z.number().describe('Unit price. Example: 25.5'),
                account_code: z.string().describe('Account code for this line item. Example: "200"'),
                tax_type: z.string().optional().describe('Tax type for this line item. Example: "OUTPUT2"'),
                line_item_id: z.string().optional().describe('Line item ID when updating existing line item')
            })
        )
        .optional()
        .describe('Line items for the purchase order')
});

const OutputSchema = z.object({
    purchase_order_id: z.string().describe('Unique Xero identifier for the purchase order'),
    purchase_order_number: z.string().describe('Purchase order number'),
    contact_id: z.string().describe('Contact ID associated with the purchase order'),
    contact_name: z.string().describe('Contact name'),
    date: z.string().describe('Date of the purchase order'),
    delivery_date: z.union([z.string(), z.null()]).describe('Expected delivery date'),
    reference: z.union([z.string(), z.null()]).describe('Reference for the purchase order'),
    status: z.string().describe('Status of the purchase order'),
    sub_total: z.number().describe('Subtotal amount'),
    total_tax: z.number().describe('Total tax amount'),
    total: z.number().describe('Total amount'),
    updated_date_utc: z.string().describe('UTC timestamp of the update')
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ConnectionItemSchema = z.object({
    id: z.string().optional(),
    tenantId: z.string().optional(),
    tenantName: z.string().optional(),
    tenantType: z.string().optional()
});

const ConnectionDataSchema = z.array(ConnectionItemSchema);

const PurchaseOrderResponseSchema = z.object({
    PurchaseOrders: z.array(z.record(z.string(), z.unknown()))
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const action = createAction({
    description: 'Update an existing purchase order',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/api/accounting/overview
        const rawConnection = await nango.getConnection();
        const connectionParse = ConnectionSchema.safeParse(rawConnection);

        let tenantId: string | undefined;

        if (connectionParse.success) {
            const connection = connectionParse.data;

            if (connection.connection_config) {
                const tenantIdValue = connection.connection_config['tenant_id'];
                if (typeof tenantIdValue === 'string') {
                    tenantId = tenantIdValue;
                }
            }

            if (!tenantId && connection.metadata) {
                const tenantIdValue = connection.metadata['tenantId'];
                if (typeof tenantIdValue === 'string') {
                    tenantId = tenantIdValue;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#getting-started
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview#connections
                endpoint: 'connections',
                retries: 10
            });

            const connectionsParse = ConnectionDataSchema.safeParse(connectionsResponse.data);

            if (connectionsParse.success) {
                const connections = connectionsParse.data;
                if (connections.length === 0) {
                    throw new nango.ActionError({
                        type: 'no_tenant_found',
                        message: 'No Xero tenant found for this connection.'
                    });
                }
                if (connections.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
                const firstConnection = connections[0];
                if (firstConnection && firstConnection.tenantId) {
                    tenantId = firstConnection.tenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Unable to resolve Xero tenant ID. Please configure tenant_id in connection_config or use the get-tenants action.'
            });
        }

        // Build the purchase order payload
        const purchaseOrderPayload: Record<string, unknown> = {
            PurchaseOrderID: input.purchase_order_id
        };

        if (input.contact_id) {
            purchaseOrderPayload['Contact'] = { ContactID: input.contact_id };
        }

        if (input.date) {
            purchaseOrderPayload['Date'] = input.date;
        }

        if (input.delivery_date) {
            purchaseOrderPayload['DeliveryDate'] = input.delivery_date;
        }

        if (input.reference !== undefined) {
            purchaseOrderPayload['Reference'] = input.reference;
        }

        if (input.status) {
            purchaseOrderPayload['Status'] = input.status;
        }

        if (input.line_items && input.line_items.length > 0) {
            purchaseOrderPayload['LineItems'] = input.line_items.map((item) => {
                const lineItem: Record<string, unknown> = {
                    Description: item.description,
                    Quantity: item.quantity,
                    UnitAmount: item.unit_amount,
                    AccountCode: item.account_code
                };

                if (item.tax_type) {
                    lineItem['TaxType'] = item.tax_type;
                }

                if (item.line_item_id) {
                    lineItem['LineItemID'] = item.line_item_id;
                }

                return lineItem;
            });
        }

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.post({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                PurchaseOrders: [purchaseOrderPayload]
            },
            retries: 3
        });

        const responseParse = PurchaseOrderResponseSchema.safeParse(response.data);

        if (!responseParse.success || responseParse.data.PurchaseOrders.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'No purchase order data returned from Xero API'
            });
        }

        const purchaseOrder = responseParse.data.PurchaseOrders[0];

        if (!purchaseOrder) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Purchase order data is undefined'
            });
        }

        const contactParse = ContactSchema.safeParse(purchaseOrder['Contact']);
        const contact = contactParse.success ? contactParse.data : undefined;

        return {
            purchase_order_id: typeof purchaseOrder['PurchaseOrderID'] === 'string' ? purchaseOrder['PurchaseOrderID'] : '',
            purchase_order_number: typeof purchaseOrder['PurchaseOrderNumber'] === 'string' ? purchaseOrder['PurchaseOrderNumber'] : '',
            contact_id: contact && typeof contact.ContactID === 'string' ? contact.ContactID : '',
            contact_name: contact && typeof contact.Name === 'string' ? contact.Name : '',
            date: typeof purchaseOrder['Date'] === 'string' ? purchaseOrder['Date'] : '',
            delivery_date: typeof purchaseOrder['DeliveryDate'] === 'string' ? purchaseOrder['DeliveryDate'] : null,
            reference: typeof purchaseOrder['Reference'] === 'string' ? purchaseOrder['Reference'] : null,
            status: typeof purchaseOrder['Status'] === 'string' ? purchaseOrder['Status'] : '',
            sub_total: typeof purchaseOrder['SubTotal'] === 'number' ? purchaseOrder['SubTotal'] : 0,
            total_tax: typeof purchaseOrder['TotalTax'] === 'number' ? purchaseOrder['TotalTax'] : 0,
            total: typeof purchaseOrder['Total'] === 'number' ? purchaseOrder['Total'] : 0,
            updated_date_utc: typeof purchaseOrder['UpdatedDateUTC'] === 'string' ? purchaseOrder['UpdatedDateUTC'] : ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
