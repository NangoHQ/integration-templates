import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().optional().describe('Line item description'),
    quantity: z.number().optional().describe('Quantity of the item'),
    unit_amount: z.number().optional().describe('Unit amount of the item'),
    account_code: z.string().optional().describe('Account code'),
    tax_type: z.string().optional().describe('Tax type'),
    line_item_id: z.string().optional().describe('Line item ID for existing line items')
});

const ContactInputSchema = z.object({
    contact_id: z.string().optional().describe('Contact ID'),
    name: z.string().optional().describe('Contact name')
});

const InputSchema = z
    .object({
        purchase_order_id: z.string().describe('Xero generated unique identifier for the purchase order. Example: "f9627f0d-b715-4039-bb6a-96dc3eae5ec5"'),
        contact: ContactInputSchema.optional().describe('Contact for the purchase order'),
        line_items: z.array(LineItemInputSchema).optional().describe('Line items for the purchase order'),
        date: z.string().optional().describe('Date purchase order was issued – YYYY-MM-DD'),
        delivery_date: z.string().optional().describe('Date the goods are to be delivered – YYYY-MM-DD'),
        line_amount_types: z.string().optional().describe('Line amount types: Exclusive, Inclusive, or NoTax'),
        reference: z.string().optional().describe('Additional reference number'),
        branding_theme_id: z.string().optional().describe('Branding theme ID'),
        currency_code: z.string().optional().describe('Currency code'),
        status: z.string().optional().describe('Status: DRAFT, SUBMITTED, AUTHORISED, BILLED, or DELETED'),
        sent_to_contact: z.boolean().optional().describe('Boolean to set whether the purchase order should be marked as sent'),
        delivery_address: z.string().optional().describe('The address the goods are to be delivered to'),
        attention_to: z.string().optional().describe('The person that the delivery is going to'),
        telephone: z.string().optional().describe('The phone number for the person accepting the delivery'),
        delivery_instructions: z.string().optional().describe('A free text field for instructions (500 characters max)'),
        expected_arrival_date: z.string().optional().describe('The date the goods are expected to arrive'),
        currency_rate: z.number().optional().describe('The currency rate for a multicurrency purchase order')
    })
    .describe('Input to update an existing Xero purchase order');

const LineItemSchema = z.object({
    Description: z.string().optional().describe('Line item description'),
    Quantity: z.number().optional().describe('Quantity of the item'),
    UnitAmount: z.number().optional().describe('Unit amount of the item'),
    AccountCode: z.string().optional().describe('Account code'),
    TaxType: z.string().optional().describe('Tax type'),
    LineItemID: z.string().optional().describe('Line item ID'),
    LineAmount: z.number().optional().describe('Line amount'),
    TaxAmount: z.number().optional().describe('Tax amount'),
    Tracking: z.array(z.record(z.string(), z.unknown())).optional().describe('Tracking categories')
});

const ContactSchema = z.object({
    ContactID: z.string().optional().describe('Contact ID'),
    Name: z.string().optional().describe('Contact name'),
    ContactStatus: z.string().optional().describe('Contact status'),
    FirstName: z.string().optional().describe('First name'),
    LastName: z.string().optional().describe('Last name'),
    EmailAddress: z.string().optional().describe('Email address'),
    BankAccountDetails: z.string().optional().describe('Bank account details'),
    Addresses: z.array(z.record(z.string(), z.unknown()).nullable()).optional().describe('Addresses'),
    Phones: z.array(z.record(z.string(), z.unknown()).nullable()).optional().describe('Phone numbers'),
    ContactGroups: z.array(z.record(z.string(), z.unknown())).optional().describe('Contact groups'),
    ContactPersons: z.array(z.record(z.string(), z.unknown())).optional().describe('Contact persons'),
    IsSupplier: z.boolean().optional().describe('Whether the contact is a supplier'),
    IsCustomer: z.boolean().optional().describe('Whether the contact is a customer'),
    SalesTrackingCategories: z.array(z.record(z.string(), z.unknown())).optional().describe('Sales tracking categories'),
    PurchasesTrackingCategories: z.array(z.record(z.string(), z.unknown())).optional().describe('Purchases tracking categories'),
    HasValidationErrors: z.boolean().optional().describe('Whether the contact has validation errors'),
    UpdatedDateUTC: z.string().optional().describe('Last updated date in UTC')
});

const PurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string().describe('Purchase order ID'),
    PurchaseOrderNumber: z.string().optional().describe('Purchase order number'),
    DateString: z.string().optional().describe('Date as a string'),
    Date: z.string().optional().describe('Date'),
    DeliveryDate: z.string().optional().describe('Delivery date'),
    AttentionTo: z.string().optional().describe('Person the delivery is for'),
    HasErrors: z.boolean().optional().describe('Whether the purchase order has errors'),
    IsDiscounted: z.boolean().optional().describe('Whether the purchase order is discounted'),
    Type: z.string().optional().describe('Type'),
    CurrencyRate: z.number().optional().describe('Currency rate'),
    CurrencyCode: z.string().optional().describe('Currency code'),
    Contact: ContactSchema.optional().describe('Contact'),
    Status: z.string().optional().describe('Status'),
    SentToContact: z.boolean().optional().describe('Whether sent to contact'),
    DeliveryAddress: z.string().optional().describe('Delivery address'),
    Telephone: z.string().optional().describe('Telephone number'),
    DeliveryInstructions: z.string().optional().describe('Delivery instructions'),
    ExpectedArrivalDate: z.string().optional().describe('Expected arrival date'),
    LineAmountTypes: z.string().optional().describe('Line amount types'),
    Reference: z.string().optional().describe('Reference'),
    BrandingThemeID: z.string().optional().describe('Branding theme ID'),
    LineItems: z.array(LineItemSchema).optional().describe('Line items'),
    SubTotal: z.number().optional().describe('Subtotal'),
    TotalTax: z.number().optional().describe('Total tax'),
    Total: z.number().optional().describe('Total'),
    TotalDiscount: z.number().optional().describe('Total discount'),
    HasAttachments: z.boolean().optional().describe('Whether there are attachments'),
    UpdatedDateUTC: z.string().optional().describe('Last updated date in UTC'),
    StatusAttributeString: z.string().optional().describe('Status attribute string'),
    ValidationErrors: z.array(z.record(z.string(), z.unknown())).optional().describe('Validation errors'),
    Warnings: z.array(z.record(z.string(), z.unknown())).optional().describe('Warnings')
});

const ProviderResponseSchema = z.object({
    Id: z.string().describe('Response ID'),
    Status: z.string().describe('Response status'),
    ProviderName: z.string().describe('Provider name'),
    DateTimeUTC: z.string().describe('Date and time in UTC'),
    PurchaseOrders: z.array(PurchaseOrderSchema).describe('Purchase orders')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Purchase order ID'),
        purchase_order_number: z.string().optional().describe('Purchase order number'),
        date: z.string().optional().describe('Date'),
        delivery_date: z.string().optional().describe('Delivery date'),
        attention_to: z.string().optional().describe('Person the delivery is for'),
        has_errors: z.boolean().optional().describe('Whether the purchase order has errors'),
        is_discounted: z.boolean().optional().describe('Whether the purchase order is discounted'),
        type: z.string().optional().describe('Type'),
        currency_rate: z.number().optional().describe('Currency rate'),
        currency_code: z.string().optional().describe('Currency code'),
        contact: ContactSchema.optional().describe('Contact'),
        status: z.string().optional().describe('Status'),
        sent_to_contact: z.boolean().optional().describe('Whether sent to contact'),
        delivery_address: z.string().optional().describe('Delivery address'),
        telephone: z.string().optional().describe('Telephone number'),
        delivery_instructions: z.string().optional().describe('Delivery instructions'),
        expected_arrival_date: z.string().optional().describe('Expected arrival date'),
        line_amount_types: z.string().optional().describe('Line amount types'),
        reference: z.string().optional().describe('Reference'),
        branding_theme_id: z.string().optional().describe('Branding theme ID'),
        line_items: z.array(LineItemSchema).optional().describe('Line items'),
        sub_total: z.number().optional().describe('Subtotal'),
        total_tax: z.number().optional().describe('Total tax'),
        total: z.number().optional().describe('Total'),
        total_discount: z.number().optional().describe('Total discount'),
        has_attachments: z.boolean().optional().describe('Whether there are attachments'),
        updated_date_utc: z.string().optional().describe('Last updated date in UTC'),
        status_attribute_string: z.string().optional().describe('Status attribute string'),
        validation_errors: z.array(z.record(z.string(), z.unknown())).optional().describe('Validation errors'),
        warnings: z.array(z.record(z.string(), z.unknown())).optional().describe('Warnings')
    })
    .describe('Updated Xero purchase order');

function mapPurchaseOrderToOutput(po: z.infer<typeof PurchaseOrderSchema>): z.infer<typeof OutputSchema> {
    return {
        id: po.PurchaseOrderID,
        ...(po.PurchaseOrderNumber !== undefined && { purchase_order_number: po.PurchaseOrderNumber }),
        ...(po.Date !== undefined && { date: po.Date }),
        ...(po.DeliveryDate !== undefined && { delivery_date: po.DeliveryDate }),
        ...(po.AttentionTo !== undefined && { attention_to: po.AttentionTo }),
        ...(po.HasErrors !== undefined && { has_errors: po.HasErrors }),
        ...(po.IsDiscounted !== undefined && { is_discounted: po.IsDiscounted }),
        ...(po.Type !== undefined && { type: po.Type }),
        ...(po.CurrencyRate !== undefined && { currency_rate: po.CurrencyRate }),
        ...(po.CurrencyCode !== undefined && { currency_code: po.CurrencyCode }),
        ...(po.Contact !== undefined && { contact: po.Contact }),
        ...(po.Status !== undefined && { status: po.Status }),
        ...(po.SentToContact !== undefined && { sent_to_contact: po.SentToContact }),
        ...(po.DeliveryAddress !== undefined && { delivery_address: po.DeliveryAddress }),
        ...(po.Telephone !== undefined && { telephone: po.Telephone }),
        ...(po.DeliveryInstructions !== undefined && { delivery_instructions: po.DeliveryInstructions }),
        ...(po.ExpectedArrivalDate !== undefined && { expected_arrival_date: po.ExpectedArrivalDate }),
        ...(po.LineAmountTypes !== undefined && { line_amount_types: po.LineAmountTypes }),
        ...(po.Reference !== undefined && { reference: po.Reference }),
        ...(po.BrandingThemeID !== undefined && { branding_theme_id: po.BrandingThemeID }),
        ...(po.LineItems !== undefined && { line_items: po.LineItems }),
        ...(po.SubTotal !== undefined && { sub_total: po.SubTotal }),
        ...(po.TotalTax !== undefined && { total_tax: po.TotalTax }),
        ...(po.Total !== undefined && { total: po.Total }),
        ...(po.TotalDiscount !== undefined && { total_discount: po.TotalDiscount }),
        ...(po.HasAttachments !== undefined && { has_attachments: po.HasAttachments }),
        ...(po.UpdatedDateUTC !== undefined && { updated_date_utc: po.UpdatedDateUTC }),
        ...(po.StatusAttributeString !== undefined && { status_attribute_string: po.StatusAttributeString }),
        ...(po.ValidationErrors !== undefined && { validation_errors: po.ValidationErrors }),
        ...(po.Warnings !== undefined && { warnings: po.Warnings })
    };
}

function buildPurchaseOrderBody(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const body: Record<string, unknown> = {
        PurchaseOrderID: input.purchase_order_id
    };

    if (input.contact !== undefined) {
        const contactBody: Record<string, unknown> = {};
        if (input.contact.contact_id !== undefined) {
            contactBody['ContactID'] = input.contact.contact_id;
        }
        if (input.contact.name !== undefined) {
            contactBody['Name'] = input.contact.name;
        }
        if (Object.keys(contactBody).length > 0) {
            body['Contact'] = contactBody;
        }
    }

    if (input.line_items !== undefined && input.line_items.length > 0) {
        body['LineItems'] = input.line_items.map((item) => {
            const lineItem: Record<string, unknown> = {};
            if (item.description !== undefined) {
                lineItem['Description'] = item.description;
            }
            if (item.quantity !== undefined) {
                lineItem['Quantity'] = item.quantity;
            }
            if (item.unit_amount !== undefined) {
                lineItem['UnitAmount'] = item.unit_amount;
            }
            if (item.account_code !== undefined) {
                lineItem['AccountCode'] = item.account_code;
            }
            if (item.tax_type !== undefined) {
                lineItem['TaxType'] = item.tax_type;
            }
            if (item.line_item_id !== undefined) {
                lineItem['LineItemID'] = item.line_item_id;
            }
            return lineItem;
        });
    }

    if (input.date !== undefined) {
        body['Date'] = input.date;
    }
    if (input.delivery_date !== undefined) {
        body['DeliveryDate'] = input.delivery_date;
    }
    if (input.line_amount_types !== undefined) {
        body['LineAmountTypes'] = input.line_amount_types;
    }
    if (input.reference !== undefined) {
        body['Reference'] = input.reference;
    }
    if (input.branding_theme_id !== undefined) {
        body['BrandingThemeID'] = input.branding_theme_id;
    }
    if (input.currency_code !== undefined) {
        body['CurrencyCode'] = input.currency_code;
    }
    if (input.status !== undefined) {
        body['Status'] = input.status;
    }
    if (input.sent_to_contact !== undefined) {
        body['SentToContact'] = input.sent_to_contact;
    }
    if (input.delivery_address !== undefined) {
        body['DeliveryAddress'] = input.delivery_address;
    }
    if (input.attention_to !== undefined) {
        body['AttentionTo'] = input.attention_to;
    }
    if (input.telephone !== undefined) {
        body['Telephone'] = input.telephone;
    }
    if (input.delivery_instructions !== undefined) {
        body['DeliveryInstructions'] = input.delivery_instructions;
    }
    if (input.expected_arrival_date !== undefined) {
        body['ExpectedArrivalDate'] = input.expected_arrival_date;
    }
    if (input.currency_rate !== undefined) {
        body['CurrencyRate'] = input.currency_rate;
    }

    return body;
}

type NangoAction = Parameters<(typeof action)['exec']>[0];

async function resolveTenantId(nango: NangoAction): Promise<string> {
    const connectionResponse = await nango.getConnection();
    const connection = z
        .object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).nullable().optional()
        })
        .parse(connectionResponse);

    if (connection.connection_config) {
        const tenantId = connection.connection_config['tenant_id'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    if (connection.metadata) {
        const tenantId = connection.metadata['tenantId'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    const config: ProxyConfiguration = {
        // https://developer.xero.com/documentation/api/accounting/requests-and-responses
        endpoint: 'connections',
        retries: 10
    };
    const connectionsResponse = await nango.get(config);
    const parsedConnectionsData = z.array(z.record(z.string(), z.unknown())).safeParse(connectionsResponse.data);

    if (!parsedConnectionsData.success || parsedConnectionsData.data.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (parsedConnectionsData.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = parsedConnectionsData.data[0];
    const tenantId = firstConnection ? firstConnection['tenantId'] : undefined;
    if (typeof tenantId === 'string' && tenantId.length > 0) {
        return tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing purchase order via the API and writes the updated fields back.
 * @pitfalls: An AUTHORISED purchase order cannot be deleted directly; it must be voided first. DELETED is only valid from DRAFT or SUBMITTED, and SentToContact requires AUTHORISED or BILLED status.
 */
const action = createAction({
    description: 'Update an existing purchase order.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);
        const purchaseOrderBody = buildPurchaseOrderBody(input);

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/purchaseorders
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                PurchaseOrders: [purchaseOrderBody]
            },
            retries: 3
        };
        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty response from Xero API.'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        if (!providerData.PurchaseOrders || providerData.PurchaseOrders.length === 0) {
            throw new nango.ActionError({
                type: 'no_purchase_order',
                message: 'No purchase order returned in the response.'
            });
        }

        const purchaseOrder = providerData.PurchaseOrders[0];
        if (purchaseOrder === undefined) {
            throw new nango.ActionError({
                type: 'no_purchase_order',
                message: 'No purchase order returned in the response.'
            });
        }

        return mapPurchaseOrderToOutput(purchaseOrder);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
