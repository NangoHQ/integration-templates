import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    purchaseOrderId: z.string().describe('Unique Xero identifier for the purchase order. Example: "8b68b396-8735-4f50-b253-5a3aabe6e0f5"'),
    contactId: z.string().optional().describe('Optional Contact ID to update. Example: "8b68b396-8735-4f50-b253-5a3aabe6e0f5"'),
    date: z.string().optional().describe('Date of the purchase order in YYYY-MM-DD format. Example: "2025-04-22"'),
    deliveryDate: z.string().optional().describe('Expected delivery date in YYYY-MM-DD format. Example: "2025-05-01"'),
    reference: z.string().optional().describe('Reference for the purchase order. Example: "PO-2025-001"'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED', 'DELETED']).optional().describe('Status of the purchase order'),
    lineItems: z
        .array(
            z.object({
                description: z.string().describe('Description of the line item. Example: "Widget A"'),
                quantity: z.number().describe('Quantity ordered. Example: 10'),
                unitAmount: z.number().describe('Unit price. Example: 25.5'),
                accountCode: z.string().describe('Account code for this line item. Example: "200"'),
                taxType: z.string().optional().describe('Tax type for this line item. Example: "OUTPUT2"'),
                lineItemId: z.string().optional().describe('Line item ID when updating existing line item')
            })
        )
        .optional()
        .describe('Line items for the purchase order')
});

const OutputSchema = z.object({
    purchaseOrderId: z.string().describe('Unique Xero identifier for the purchase order'),
    purchaseOrderNumber: z.string().describe('Purchase order number'),
    contactId: z.string().describe('Contact ID associated with the purchase order'),
    contactName: z.string().describe('Contact name'),
    date: z.string().describe('Date of the purchase order'),
    deliveryDate: z.union([z.string(), z.null()]).describe('Expected delivery date'),
    reference: z.union([z.string(), z.null()]).describe('Reference for the purchase order'),
    status: z.string().describe('Status of the purchase order'),
    subTotal: z.number().describe('Subtotal amount'),
    totalTax: z.number().describe('Total tax amount'),
    total: z.number().describe('Total amount'),
    updatedDateUtc: z.string().describe('UTC timestamp of the update')
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
            PurchaseOrderID: input.purchaseOrderId
        };

        if (input.contactId) {
            purchaseOrderPayload['Contact'] = { ContactID: input.contactId };
        }

        if (input.date) {
            purchaseOrderPayload['Date'] = input.date;
        }

        if (input.deliveryDate) {
            purchaseOrderPayload['DeliveryDate'] = input.deliveryDate;
        }

        if (input.reference !== undefined) {
            purchaseOrderPayload['Reference'] = input.reference;
        }

        if (input.status) {
            purchaseOrderPayload['Status'] = input.status;
        }

        if (input.lineItems && input.lineItems.length > 0) {
            purchaseOrderPayload['LineItems'] = input.lineItems.map((item) => {
                const lineItem: Record<string, unknown> = {
                    Description: item.description,
                    Quantity: item.quantity,
                    UnitAmount: item.unitAmount,
                    AccountCode: item.accountCode
                };

                if (item.taxType) {
                    lineItem['TaxType'] = item.taxType;
                }

                if (item.lineItemId) {
                    lineItem['LineItemID'] = item.lineItemId;
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

        const purchaseOrderId = purchaseOrder['PurchaseOrderID'];
        const purchaseOrderNumber = purchaseOrder['PurchaseOrderNumber'];
        const contactId = contact?.ContactID;
        const contactName = contact?.Name;
        const date = purchaseOrder['Date'];
        const status = purchaseOrder['Status'];
        const subTotal = purchaseOrder['SubTotal'];
        const totalTax = purchaseOrder['TotalTax'];
        const total = purchaseOrder['Total'];
        const updatedDateUtc = purchaseOrder['UpdatedDateUTC'];

        if (typeof purchaseOrderId !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: PurchaseOrderID' });
        }
        if (typeof purchaseOrderNumber !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: PurchaseOrderNumber' });
        }
        if (typeof contactId !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: Contact.ContactID' });
        }
        if (typeof contactName !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: Contact.Name' });
        }
        if (typeof date !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: Date' });
        }
        if (typeof status !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: Status' });
        }
        if (typeof subTotal !== 'number') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: SubTotal' });
        }
        if (typeof totalTax !== 'number') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: TotalTax' });
        }
        if (typeof total !== 'number') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: Total' });
        }
        if (typeof updatedDateUtc !== 'string') {
            throw new nango.ActionError({ type: 'invalid_response', message: 'Xero response missing required field: UpdatedDateUTC' });
        }

        return {
            purchaseOrderId,
            purchaseOrderNumber,
            contactId,
            contactName,
            date,
            deliveryDate: typeof purchaseOrder['DeliveryDate'] === 'string' ? purchaseOrder['DeliveryDate'] : null,
            reference: typeof purchaseOrder['Reference'] === 'string' ? purchaseOrder['Reference'] : null,
            status,
            subTotal,
            totalTax,
            total,
            updatedDateUtc
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
