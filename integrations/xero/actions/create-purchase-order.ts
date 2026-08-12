import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Description of the line item.'),
    quantity: z.number().describe('Quantity of the line item.'),
    unitAmount: z.number().describe('Unit price of the line item.'),
    accountCode: z.string().describe('Account code for the line item. Example: "200"'),
    itemCode: z.string().optional().describe('Item code if referencing an inventory item.'),
    taxType: z.string().optional().describe('Tax type for the line item. Example: "NONE"'),
    discountRate: z.number().optional().describe('Discount rate as a percentage.')
});

const InputSchema = z
    .object({
        contactId: z.string().describe('The Xero ContactID for the purchase order. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        date: z.string().describe('The date of the purchase order in YYYY-MM-DD format. Example: "2024-01-15"'),
        status: z.enum(['DRAFT', 'AUTHORISED']).optional().describe('The status of the purchase order. Defaults to DRAFT if omitted.'),
        reference: z.string().optional().describe('A reference for the purchase order.'),
        lineItems: z.array(LineItemInputSchema).describe('Line items for the purchase order.'),
        deliveryDate: z.string().optional().describe('Expected delivery date in YYYY-MM-DD format.'),
        purchaseOrderNumber: z.string().optional().describe('Purchase order number.'),
        attentionTo: z.string().optional().describe('The person this purchase order is addressed to.'),
        telephone: z.string().optional().describe('Telephone number for the contact.'),
        deliveryInstructions: z.string().optional().describe('Delivery instructions.'),
        expectedArrivalDate: z.string().optional().describe('Expected arrival date in YYYY-MM-DD format.'),
        address: z.string().optional().describe('Delivery address.')
    })
    .describe('Input to create a Xero purchase order.');

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional(),
    DiscountRate: z.number().optional(),
    LineAmount: z.number().optional()
});

const ProviderPurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    DateString: z.string().optional(),
    Date: z.string().optional(),
    Status: z.string(),
    Contact: ProviderContactSchema.optional(),
    LineItems: z.array(ProviderLineItemSchema).optional(),
    Reference: z.string().optional(),
    DeliveryDateString: z.string().optional(),
    DeliveryDate: z.string().optional(),
    AttentionTo: z.string().optional(),
    Telephone: z.string().optional(),
    DeliveryInstructions: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    PurchaseOrders: z.array(ProviderPurchaseOrderSchema)
});

const OutputSchema = z
    .object({
        purchaseOrderId: z.string().describe('The Xero PurchaseOrderID of the created purchase order.'),
        purchaseOrderNumber: z.string().optional().describe('The purchase order number assigned by Xero.'),
        date: z.string().optional().describe('The date of the purchase order.'),
        status: z.string().describe('The status of the purchase order (DRAFT or AUTHORISED).'),
        contactId: z.string().optional().describe('The ContactID of the associated contact.'),
        contactName: z.string().optional().describe('The name of the associated contact.'),
        lineItems: z
            .array(
                z
                    .object({
                        description: z.string().optional().describe('Description of the line item.'),
                        quantity: z.number().optional().describe('Quantity of the line item.'),
                        unitAmount: z.number().optional().describe('Unit price of the line item.'),
                        accountCode: z.string().optional().describe('Account code for the line item.'),
                        itemCode: z.string().optional().describe('Item code if referencing an inventory item.'),
                        taxType: z.string().optional().describe('Tax type for the line item.'),
                        discountRate: z.number().optional().describe('Discount rate as a percentage.'),
                        lineAmount: z.number().optional().describe('Total amount for this line item.')
                    })
                    .describe('A line item on the purchase order.')
            )
            .optional()
            .describe('Line items on the purchase order.'),
        reference: z.string().optional().describe('Reference for the purchase order.'),
        deliveryDate: z.string().optional().describe('Expected delivery date.'),
        subTotal: z.number().optional().describe('Subtotal of the purchase order.'),
        totalTax: z.number().optional().describe('Total tax amount.'),
        total: z.number().optional().describe('Total amount including tax.')
    })
    .describe('The created Xero purchase order.');

/**
 * @tags: [write]
 * @tagReason: Creates a new purchase order in Xero.
 * @pitfalls: Archived contacts block creation with a validation error; invalid account codes are silently removed from line items while the purchase order is still created.
 */
const action = createAction({
    description: 'Create a purchase order for a contact.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
            const value = connectionConfig['tenant_id'];
            if (typeof value === 'string' && value.length > 0) {
                tenantId = value;
            }
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
                const value = metadata['tenantId'];
                if (typeof value === 'string' && value.length > 0) {
                    tenantId = value;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const response = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = response.data;
            if (!connectionsData || typeof connectionsData !== 'object' || !Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                const value = firstConnection['tenantId'];
                if (typeof value === 'string' && value.length > 0) {
                    tenantId = value;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const lineItems = input.lineItems.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unitAmount,
            AccountCode: item.accountCode,
            ...(item.itemCode !== undefined && { ItemCode: item.itemCode }),
            ...(item.taxType !== undefined && { TaxType: item.taxType }),
            ...(item.discountRate !== undefined && { DiscountRate: item.discountRate })
        }));

        const purchaseOrderPayload: Record<string, unknown> = {
            Contact: { ContactID: input.contactId },
            Date: input.date,
            LineItems: lineItems
        };

        if (input.status !== undefined) {
            purchaseOrderPayload['Status'] = input.status;
        }
        if (input.reference !== undefined) {
            purchaseOrderPayload['Reference'] = input.reference;
        }
        if (input.deliveryDate !== undefined) {
            purchaseOrderPayload['DeliveryDate'] = input.deliveryDate;
        }
        if (input.purchaseOrderNumber !== undefined) {
            purchaseOrderPayload['PurchaseOrderNumber'] = input.purchaseOrderNumber;
        }
        if (input.attentionTo !== undefined) {
            purchaseOrderPayload['AttentionTo'] = input.attentionTo;
        }
        if (input.telephone !== undefined) {
            purchaseOrderPayload['Telephone'] = input.telephone;
        }
        if (input.deliveryInstructions !== undefined) {
            purchaseOrderPayload['DeliveryInstructions'] = input.deliveryInstructions;
        }
        if (input.expectedArrivalDate !== undefined) {
            purchaseOrderPayload['ExpectedArrivalDate'] = input.expectedArrivalDate;
        }
        if (input.address !== undefined) {
            purchaseOrderPayload['Address'] = input.address;
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.put({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                PurchaseOrders: [purchaseOrderPayload]
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const created = parsedResponse.PurchaseOrders[0];

        if (!created) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Purchase order creation failed. No purchase order was returned by the API.'
            });
        }

        return {
            purchaseOrderId: created.PurchaseOrderID,
            ...(created.PurchaseOrderNumber !== undefined && { purchaseOrderNumber: created.PurchaseOrderNumber }),
            ...(created.DateString !== undefined && { date: created.DateString }),
            ...(created.Date !== undefined && created.DateString === undefined && { date: created.Date }),
            status: created.Status,
            ...(created.Contact?.ContactID !== undefined && { contactId: created.Contact.ContactID }),
            ...(created.Contact?.Name !== undefined && { contactName: created.Contact.Name }),
            ...(created.LineItems !== undefined && {
                lineItems: created.LineItems.map((item) => ({
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unitAmount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { accountCode: item.AccountCode }),
                    ...(item.ItemCode !== undefined && { itemCode: item.ItemCode }),
                    ...(item.TaxType !== undefined && { taxType: item.TaxType }),
                    ...(item.DiscountRate !== undefined && { discountRate: item.DiscountRate }),
                    ...(item.LineAmount !== undefined && { lineAmount: item.LineAmount })
                }))
            }),
            ...(created.Reference !== undefined && { reference: created.Reference }),
            ...(created.DeliveryDateString !== undefined && { deliveryDate: created.DeliveryDateString }),
            ...(created.DeliveryDate !== undefined && created.DeliveryDateString === undefined && { deliveryDate: created.DeliveryDate }),
            ...(created.SubTotal !== undefined && { subTotal: created.SubTotal }),
            ...(created.TotalTax !== undefined && { totalTax: created.TotalTax }),
            ...(created.Total !== undefined && { total: created.Total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
