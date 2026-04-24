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

const InputSchema = z.object({
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
});

const LineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    LineItemID: z.string().optional(),
    LineAmount: z.number().optional(),
    TaxAmount: z.number().optional(),
    Tracking: z.array(z.record(z.string(), z.unknown())).optional()
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional(),
    ContactStatus: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    BankAccountDetails: z.string().optional(),
    Addresses: z.array(z.record(z.string(), z.unknown()).nullable()).optional(),
    Phones: z.array(z.record(z.string(), z.unknown()).nullable()).optional(),
    ContactGroups: z.array(z.record(z.string(), z.unknown())).optional(),
    ContactPersons: z.array(z.record(z.string(), z.unknown())).optional(),
    IsSupplier: z.boolean().optional(),
    IsCustomer: z.boolean().optional(),
    SalesTrackingCategories: z.array(z.record(z.string(), z.unknown())).optional(),
    PurchasesTrackingCategories: z.array(z.record(z.string(), z.unknown())).optional(),
    HasValidationErrors: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional()
});

const PurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    DateString: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    AttentionTo: z.string().optional(),
    HasErrors: z.boolean().optional(),
    IsDiscounted: z.boolean().optional(),
    Type: z.string().optional(),
    CurrencyRate: z.number().optional(),
    CurrencyCode: z.string().optional(),
    Contact: ContactSchema.optional(),
    Status: z.string().optional(),
    SentToContact: z.boolean().optional(),
    DeliveryAddress: z.string().optional(),
    Telephone: z.string().optional(),
    DeliveryInstructions: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    Reference: z.string().optional(),
    BrandingThemeID: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    TotalDiscount: z.number().optional(),
    HasAttachments: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    StatusAttributeString: z.string().optional(),
    ValidationErrors: z.array(z.record(z.string(), z.unknown())).optional(),
    Warnings: z.array(z.record(z.string(), z.unknown())).optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string(),
    DateTimeUTC: z.string(),
    PurchaseOrders: z.array(PurchaseOrderSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    purchase_order_number: z.string().optional(),
    date: z.string().optional(),
    delivery_date: z.string().optional(),
    attention_to: z.string().optional(),
    has_errors: z.boolean().optional(),
    is_discounted: z.boolean().optional(),
    type: z.string().optional(),
    currency_rate: z.number().optional(),
    currency_code: z.string().optional(),
    contact: ContactSchema.optional(),
    status: z.string().optional(),
    sent_to_contact: z.boolean().optional(),
    delivery_address: z.string().optional(),
    telephone: z.string().optional(),
    delivery_instructions: z.string().optional(),
    expected_arrival_date: z.string().optional(),
    line_amount_types: z.string().optional(),
    reference: z.string().optional(),
    branding_theme_id: z.string().optional(),
    line_items: z.array(LineItemSchema).optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional(),
    total_discount: z.number().optional(),
    has_attachments: z.boolean().optional(),
    updated_date_utc: z.string().optional(),
    status_attribute_string: z.string().optional(),
    validation_errors: z.array(z.record(z.string(), z.unknown())).optional(),
    warnings: z.array(z.record(z.string(), z.unknown())).optional()
});

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
    const connectionsData = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);

    if (connectionsData.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant',
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
    if (!firstConnection || typeof firstConnection !== 'object') {
        throw new nango.ActionError({
            type: 'invalid_tenant',
            message: 'Invalid tenant data returned from connections endpoint.'
        });
    }

    const tenantId = firstConnection['tenantId'];
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant_id',
            message: 'Tenant ID not found in connections response.'
        });
    }

    return tenantId;
}

type NangoAction = Parameters<(typeof action)['exec']>[0];

const action = createAction({
    description: 'Update an existing purchase order.',
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
