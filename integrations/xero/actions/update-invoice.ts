import { z } from 'zod';
import { createAction } from 'nango';

const TrackingInputSchema = z.object({
    TrackingCategoryID: z.string().optional().describe('Xero identifier for a tracking category'),
    TrackingOptionID: z.string().optional().describe('Xero identifier for a tracking category option'),
    Name: z.string().optional().describe('Name of the tracking category'),
    Option: z.string().optional().describe('Name of the tracking option')
});

const LineItemInputSchema = z.object({
    LineItemID: z
        .string()
        .optional()
        .describe('Xero identifier for the line item. Recommended on update requests to avoid deleting and recreating the line item'),
    Description: z.string().optional().describe('Description of the line item. Must be at least 1 character if provided. Max length: 4000'),
    Quantity: z.number().optional().describe('Quantity of the line item'),
    UnitAmount: z.number().optional().describe('Unit amount of the line item'),
    AccountCode: z.string().optional().describe('Account code for the line item'),
    ItemCode: z.string().optional().describe('Item code for the line item'),
    TaxType: z.string().optional().describe('Tax type override for the line item'),
    LineAmount: z.number().optional().describe('Total line amount. If Quantity or UnitAmount is omitted, Xero can calculate the missing amount from this'),
    DiscountRate: z.number().optional().describe('Percentage discount applied to the line item. Only supported on ACCREC invoices'),
    DiscountAmount: z.number().optional().describe('Discount amount applied to the line item. Only supported on ACCREC invoices'),
    Tracking: z.array(TrackingInputSchema).optional().describe('Optional tracking categories for the line item. Maximum 2 per line item')
});

const InputSchema = z
    .object({
        InvoiceID: z.string().describe('Xero identifier for the invoice to update. Example: "06c18279-c848-4b69-b434-6b9fecc75a47"'),
        Type: z.string().optional().describe('Invoice type. Example: "ACCREC" or "ACCPAY"'),
        ContactID: z
            .string()
            .optional()
            .describe('Xero identifier for the contact associated with the invoice. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        Date: z.string().optional().describe('Date the invoice was issued in YYYY-MM-DD format. Example: "2024-01-15"'),
        DueDate: z.string().optional().describe('Date the invoice is due in YYYY-MM-DD format. Example: "2024-02-15"'),
        Status: z.string().optional().describe('Invoice status. Allowed values: DRAFT, SUBMITTED, DELETED, AUTHORISED, PAID, VOIDED'),
        InvoiceNumber: z.string().optional().describe('Unique alpha numeric code identifying the invoice. Max length: 255'),
        Reference: z.string().optional().describe('Additional reference number. Max length: 255'),
        CurrencyCode: z.string().optional().describe('Currency code the invoice was raised in. Example: "USD"'),
        Url: z.string().optional().describe('URL link to a source document shown in the Xero app'),
        BrandingThemeID: z.string().optional().describe('Xero identifier for a branding theme'),
        SentToContact: z.boolean().optional().describe('Whether the invoice should be marked as sent in the Xero app. Only settable on approved invoices'),
        ExpectedPaymentDate: z.string().optional().describe('Expected payment date shown on sales invoices in YYYY-MM-DD format'),
        PlannedPaymentDate: z.string().optional().describe('Planned payment date shown on bills in YYYY-MM-DD format'),
        LineItems: z
            .array(LineItemInputSchema)
            .optional()
            .describe('Line items for the invoice. Omitting LineItemID on existing line items causes them to be deleted and recreated')
    })
    .describe('Input for updating an existing Xero invoice');

const LineItemOutputSchema = z.object({
    LineItemID: z.string().optional().describe('Xero identifier for the line item'),
    Description: z.string().optional().describe('Line item description'),
    Quantity: z.number().optional().describe('Line item quantity'),
    UnitAmount: z.number().optional().describe('Line item unit amount'),
    AccountCode: z.string().optional().describe('Account code'),
    ItemCode: z.string().optional().describe('Item code'),
    TaxType: z.string().optional().describe('Tax type'),
    LineAmount: z.number().optional().describe('Total line amount')
});

const ContactOutputSchema = z.object({
    ContactID: z.string().optional().describe('Xero identifier for the contact'),
    Name: z.string().optional().describe('Contact name')
});

const OutputSchema = z
    .object({
        InvoiceID: z.string().describe('Xero identifier for the updated invoice'),
        Type: z.string().describe('Invoice type'),
        Status: z.string().describe('Invoice status'),
        InvoiceNumber: z.string().optional().describe('Unique invoice number'),
        Reference: z.string().optional().describe('Additional reference number'),
        Date: z.string().optional().describe('Date the invoice was issued'),
        DueDate: z.string().optional().describe('Date the invoice is due'),
        Contact: ContactOutputSchema.optional().describe('Contact associated with the invoice'),
        CurrencyCode: z.string().optional().describe('Currency code'),
        SubTotal: z.number().optional().describe('Total excluding taxes'),
        TotalTax: z.number().optional().describe('Total tax'),
        Total: z.number().optional().describe('Total including tax'),
        AmountDue: z.number().optional().describe('Amount remaining to be paid'),
        AmountPaid: z.number().optional().describe('Sum of payments received'),
        UpdatedDateUTC: z.string().optional().describe('Last modified date in UTC'),
        HasErrors: z.boolean().optional().describe('Whether the invoice has validation errors'),
        LineItems: z.array(LineItemOutputSchema).optional().describe('Line items on the invoice')
    })
    .describe('Output containing the updated Xero invoice');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const PostResponseSchema = z.object({
    Invoices: z.array(z.record(z.string(), z.unknown())).optional().nullable()
});

const ProviderInvoiceSchema = z.object({
    InvoiceID: z.string(),
    Type: z.string(),
    Status: z.string(),
    InvoiceNumber: z.string().optional().nullable(),
    Reference: z.string().optional().nullable(),
    Date: z.string().optional().nullable(),
    DueDate: z.string().optional().nullable(),
    Contact: z.record(z.string(), z.unknown()).optional().nullable(),
    CurrencyCode: z.string().optional().nullable(),
    SubTotal: z.number().optional().nullable(),
    TotalTax: z.number().optional().nullable(),
    Total: z.number().optional().nullable(),
    AmountDue: z.number().optional().nullable(),
    AmountPaid: z.number().optional().nullable(),
    UpdatedDateUTC: z.string().optional().nullable(),
    HasErrors: z.boolean().optional().nullable(),
    ValidationErrors: z
        .array(
            z.object({
                Message: z.string().optional()
            })
        )
        .optional()
        .nullable(),
    LineItems: z.array(z.record(z.string(), z.unknown())).optional().nullable()
});

const ProviderLineItemSchema = z.object({
    LineItemID: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Quantity: z.number().optional().nullable(),
    UnitAmount: z.number().optional().nullable(),
    AccountCode: z.string().optional().nullable(),
    ItemCode: z.string().optional().nullable(),
    TaxType: z.string().optional().nullable(),
    LineAmount: z.number().optional().nullable()
});

/**
 * @tags: [write]
 * @tagReason: Modifies an existing invoice on the Xero provider.
 * @pitfalls: Omitting LineItemID on an existing line item deletes and recreates it; partially or fully paid invoices restrict which fields can be updated; AUTHORISED and PAID invoices must be VOIDED before their Status can be set to DELETED.
 */
const action = createAction({
    description: 'Update an existing invoice',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const resolveTenantId = async (): Promise<string> => {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionResponse = await nango.getConnection();
            const connection = ConnectionSchema.parse(connectionResponse);

            const configTenantId = connection.connection_config?.['tenant_id'];
            if (typeof configTenantId === 'string' && configTenantId.length > 0) {
                return configTenantId;
            }

            const metadataTenantId = connection.metadata?.['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                return metadataTenantId;
            }

            // https://developer.xero.com/documentation/guides/oauth2/tenants/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const rawConnections = connectionsResponse.data;

            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstTenant = rawConnections[0];
            if (
                typeof firstTenant === 'object' &&
                firstTenant !== null &&
                'tenantId' in firstTenant &&
                typeof firstTenant['tenantId'] === 'string' &&
                firstTenant['tenantId'].length > 0
            ) {
                return firstTenant['tenantId'];
            }

            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        };

        const tenantId = await resolveTenantId();

        const invoiceBody: Record<string, unknown> = {
            InvoiceID: input.InvoiceID
        };

        if (input.Type !== undefined) {
            invoiceBody['Type'] = input.Type;
        }
        if (input.ContactID !== undefined) {
            invoiceBody['Contact'] = { ContactID: input.ContactID };
        }
        if (input.Date !== undefined) {
            invoiceBody['Date'] = input.Date;
        }
        if (input.DueDate !== undefined) {
            invoiceBody['DueDate'] = input.DueDate;
        }
        if (input.Status !== undefined) {
            invoiceBody['Status'] = input.Status;
        }
        if (input.InvoiceNumber !== undefined) {
            invoiceBody['InvoiceNumber'] = input.InvoiceNumber;
        }
        if (input.Reference !== undefined) {
            invoiceBody['Reference'] = input.Reference;
        }
        if (input.CurrencyCode !== undefined) {
            invoiceBody['CurrencyCode'] = input.CurrencyCode;
        }
        if (input.Url !== undefined) {
            invoiceBody['Url'] = input.Url;
        }
        if (input.BrandingThemeID !== undefined) {
            invoiceBody['BrandingThemeID'] = input.BrandingThemeID;
        }
        if (input.SentToContact !== undefined) {
            invoiceBody['SentToContact'] = input.SentToContact;
        }
        if (input.ExpectedPaymentDate !== undefined) {
            invoiceBody['ExpectedPaymentDate'] = input.ExpectedPaymentDate;
        }
        if (input.PlannedPaymentDate !== undefined) {
            invoiceBody['PlannedPaymentDate'] = input.PlannedPaymentDate;
        }
        if (input.LineItems !== undefined) {
            invoiceBody['LineItems'] = input.LineItems.map((item) => ({
                ...(item.LineItemID !== undefined && { LineItemID: item.LineItemID }),
                ...(item.Description !== undefined && { Description: item.Description }),
                ...(item.Quantity !== undefined && { Quantity: item.Quantity }),
                ...(item.UnitAmount !== undefined && { UnitAmount: item.UnitAmount }),
                ...(item.AccountCode !== undefined && { AccountCode: item.AccountCode }),
                ...(item.ItemCode !== undefined && { ItemCode: item.ItemCode }),
                ...(item.TaxType !== undefined && { TaxType: item.TaxType }),
                ...(item.LineAmount !== undefined && { LineAmount: item.LineAmount }),
                ...(item.DiscountRate !== undefined && { DiscountRate: item.DiscountRate }),
                ...(item.DiscountAmount !== undefined && { DiscountAmount: item.DiscountAmount }),
                ...(item.Tracking !== undefined && {
                    Tracking: item.Tracking.map((t) => ({
                        ...(t.TrackingCategoryID !== undefined && { TrackingCategoryID: t.TrackingCategoryID }),
                        ...(t.TrackingOptionID !== undefined && { TrackingOptionID: t.TrackingOptionID }),
                        ...(t.Name !== undefined && { Name: t.Name }),
                        ...(t.Option !== undefined && { Option: t.Option })
                    }))
                })
            }));
        }

        // https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Invoices: [invoiceBody]
            },
            retries: 3
        });

        const responseData = PostResponseSchema.parse(response.data);

        if (!Array.isArray(responseData.Invoices) || responseData.Invoices.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty Invoices array.'
            });
        }

        const invoice = responseData.Invoices[0];
        const parsedInvoice = ProviderInvoiceSchema.parse(invoice);

        if (parsedInvoice.HasErrors) {
            const errors =
                parsedInvoice.ValidationErrors?.map((e) => e.Message)
                    .filter(Boolean)
                    .join(', ') || 'Unknown validation error';
            throw new nango.ActionError({
                type: 'validation_error',
                message: `Invoice update failed: ${errors}`
            });
        }

        const mappedLineItems = Array.isArray(parsedInvoice.LineItems)
            ? parsedInvoice.LineItems.map((item) => {
                  const parsedItem = ProviderLineItemSchema.parse(item);
                  return {
                      ...(parsedItem.LineItemID != null && { LineItemID: parsedItem.LineItemID }),
                      ...(parsedItem.Description != null && { Description: parsedItem.Description }),
                      ...(parsedItem.Quantity != null && { Quantity: parsedItem.Quantity }),
                      ...(parsedItem.UnitAmount != null && { UnitAmount: parsedItem.UnitAmount }),
                      ...(parsedItem.AccountCode != null && { AccountCode: parsedItem.AccountCode }),
                      ...(parsedItem.ItemCode != null && { ItemCode: parsedItem.ItemCode }),
                      ...(parsedItem.TaxType != null && { TaxType: parsedItem.TaxType }),
                      ...(parsedItem.LineAmount != null && { LineAmount: parsedItem.LineAmount })
                  };
              })
            : undefined;

        const mappedContact =
            parsedInvoice.Contact != null && typeof parsedInvoice.Contact === 'object'
                ? {
                      ContactID: typeof parsedInvoice.Contact['ContactID'] === 'string' ? parsedInvoice.Contact['ContactID'] : undefined,
                      Name: typeof parsedInvoice.Contact['Name'] === 'string' ? parsedInvoice.Contact['Name'] : undefined
                  }
                : undefined;

        return {
            InvoiceID: parsedInvoice.InvoiceID,
            Type: parsedInvoice.Type,
            Status: parsedInvoice.Status,
            ...(parsedInvoice.InvoiceNumber != null && { InvoiceNumber: parsedInvoice.InvoiceNumber }),
            ...(parsedInvoice.Reference != null && { Reference: parsedInvoice.Reference }),
            ...(parsedInvoice.Date != null && { Date: parsedInvoice.Date }),
            ...(parsedInvoice.DueDate != null && { DueDate: parsedInvoice.DueDate }),
            ...(mappedContact !== undefined && { Contact: mappedContact }),
            ...(parsedInvoice.CurrencyCode != null && { CurrencyCode: parsedInvoice.CurrencyCode }),
            ...(parsedInvoice.SubTotal != null && { SubTotal: parsedInvoice.SubTotal }),
            ...(parsedInvoice.TotalTax != null && { TotalTax: parsedInvoice.TotalTax }),
            ...(parsedInvoice.Total != null && { Total: parsedInvoice.Total }),
            ...(parsedInvoice.AmountDue != null && { AmountDue: parsedInvoice.AmountDue }),
            ...(parsedInvoice.AmountPaid != null && { AmountPaid: parsedInvoice.AmountPaid }),
            ...(parsedInvoice.UpdatedDateUTC != null && { UpdatedDateUTC: parsedInvoice.UpdatedDateUTC }),
            ...(parsedInvoice.HasErrors != null && { HasErrors: parsedInvoice.HasErrors }),
            ...(mappedLineItems !== undefined && { LineItems: mappedLineItems })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
