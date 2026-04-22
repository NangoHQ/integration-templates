import { z } from 'zod';
import { createAction } from 'nango';

const LineItemSchema = z.object({
    description: z.string().describe('Description of the line item'),
    quantity: z.number().describe('Quantity of the line item'),
    unit_amount: z.number().describe('Unit amount of the line item'),
    account_code: z.string().optional().describe('Account code for the line item'),
    tax_type: z.string().optional().describe('Tax type for the line item'),
    item_code: z.string().optional().describe('Item code for existing items')
});

const ContactSchema = z
    .object({
        contact_id: z.string().optional().describe('Xero Contact ID (preferred)'),
        name: z.string().optional().describe('Contact name (used if contact_id not provided)')
    })
    .refine((data) => data.contact_id || data.name, {
        message: 'Either contact_id or name must be provided'
    });

const InputSchema = z.object({
    type: z.enum(['ACCREC', 'ACCPAY']).describe('Invoice type: ACCREC for Sales Invoice, ACCPAY for Purchase Bill'),
    contact: ContactSchema.describe('Contact for the invoice'),
    line_items: z.array(LineItemSchema).min(1).describe('Line items for the invoice'),
    date: z.string().optional().describe('Invoice date (YYYY-MM-DD). Defaults to today if not provided.'),
    due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
    invoice_number: z.string().optional().describe('Invoice number (auto-generated if not provided for ACCREC)'),
    reference: z.string().optional().describe('Reference for the invoice'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED']).optional().describe('Invoice status. Defaults to DRAFT if not provided.'),
    currency_code: z.string().optional().describe('Currency code (e.g., USD, GBP)'),
    sent_to_contact: z.boolean().optional().describe('Whether the invoice has been sent to the contact'),
    url: z.string().optional().describe('URL link to a source document')
});

const OutputSchema = z.object({
    invoice_id: z.string().describe('Xero Invoice ID'),
    invoice_number: z.string().describe('Invoice number'),
    type: z.enum(['ACCREC', 'ACCPAY']).describe('Invoice type'),
    status: z.string().describe('Invoice status'),
    total: z.number().describe('Total amount of the invoice'),
    sub_total: z.number().describe('Subtotal of the invoice'),
    total_tax: z.number().describe('Total tax on the invoice'),
    contact_id: z.string().describe('Xero Contact ID'),
    contact_name: z.string().describe('Contact name'),
    date: z.string().describe('Invoice date'),
    due_date: z.union([z.string(), z.null()]).describe('Due date'),
    updated_date_utc: z.string().describe('Last updated timestamp in UTC'),
    currency_code: z.union([z.string(), z.null()]).describe('Currency code'),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string().describe('Line item ID'),
                description: z.string().describe('Line item description'),
                quantity: z.number().describe('Line item quantity'),
                unit_amount: z.number().describe('Line item unit amount'),
                account_code: z.union([z.string(), z.null()]).describe('Account code'),
                tax_type: z.union([z.string(), z.null()]).describe('Tax type'),
                line_amount: z.number().describe('Line item total amount')
            })
        )
        .describe('Line items')
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    if (!connection || typeof connection !== 'object') {
        throw new nango.ActionError({
            type: 'invalid_connection',
            message: 'Failed to retrieve connection information'
        });
    }

    const connectionConfig = connection['connection_config'];
    if (connectionConfig && typeof connectionConfig === 'object' && connectionConfig['tenant_id']) {
        return String(connectionConfig['tenant_id']);
    }

    const metadata = connection['metadata'];
    if (metadata && typeof metadata === 'object' && metadata['tenantId']) {
        return String(metadata['tenantId']);
    }

    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'https://api.xero.com/connections',
        retries: 10
    });

    if (!connectionsResponse.data || typeof connectionsResponse.data !== 'object') {
        throw new nango.ActionError({
            type: 'no_tenants',
            message: 'Could not retrieve Xero tenants'
        });
    }

    const responseData = connectionsResponse.data;
    let connectionsArray: Array<Record<string, unknown>> = [];

    if (Array.isArray(responseData)) {
        connectionsArray = responseData;
    } else if (responseData['data'] && Array.isArray(responseData['data'])) {
        connectionsArray = responseData['data'];
    }

    if (connectionsArray.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenants',
            message: 'No Xero tenants found for this connection'
        });
    }

    if (connectionsArray.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connectionsArray[0];

    if (firstConnection && typeof firstConnection === 'object' && firstConnection['tenantId']) {
        return String(firstConnection['tenantId']);
    }

    throw new nango.ActionError({
        type: 'no_tenant_id',
        message: 'Could not resolve tenant ID from connections'
    });
}

function mapLineItem(inputItem: z.infer<typeof LineItemSchema>): Record<string, unknown> {
    const lineItem: Record<string, unknown> = {
        Description: inputItem.description,
        Quantity: inputItem.quantity,
        UnitAmount: inputItem.unit_amount
    };

    if (inputItem.account_code) {
        lineItem['AccountCode'] = inputItem.account_code;
    }

    if (inputItem.tax_type) {
        lineItem['TaxType'] = inputItem.tax_type;
    }

    if (inputItem.item_code) {
        lineItem['ItemCode'] = inputItem.item_code;
    }

    return lineItem;
}

function mapContact(inputContact: z.infer<typeof ContactSchema>): Record<string, unknown> {
    const contact: Record<string, unknown> = {};

    if (inputContact.contact_id) {
        contact['ContactID'] = inputContact.contact_id;
    }

    if (inputContact.name) {
        contact['Name'] = inputContact.name;
    }

    return contact;
}

const action = createAction({
    description: 'Create a sales or purchase invoice',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const invoicePayload: Record<string, unknown> = {
            Type: input.type,
            Contact: mapContact(input.contact),
            LineItems: input.line_items.map(mapLineItem)
        };

        if (input.date) {
            invoicePayload['Date'] = input.date;
        }

        if (input.due_date) {
            invoicePayload['DueDate'] = input.due_date;
        }

        if (input.invoice_number) {
            invoicePayload['InvoiceNumber'] = input.invoice_number;
        }

        if (input.reference) {
            invoicePayload['Reference'] = input.reference;
        }

        if (input.status) {
            invoicePayload['Status'] = input.status;
        }

        if (input.currency_code) {
            invoicePayload['CurrencyCode'] = input.currency_code;
        }

        if (input.sent_to_contact !== undefined) {
            invoicePayload['SentToContact'] = input.sent_to_contact;
        }

        if (input.url) {
            invoicePayload['Url'] = input.url;
        }

        const requestBody = {
            Invoices: [invoicePayload]
        };

        // https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Invoices',
            data: requestBody,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API'
            });
        }

        const responseData = response.data;

        if (responseData['ErrorNumber'] !== undefined) {
            throw new nango.ActionError({
                type: 'api_error',
                message: String(responseData['Message'] || 'Unknown Xero API error'),
                error_number: responseData['ErrorNumber']
            });
        }

        let invoices: Array<Record<string, unknown>> = [];

        if (responseData['Invoices'] && Array.isArray(responseData['Invoices'])) {
            invoices = responseData['Invoices'];
        } else if (responseData['data'] && Array.isArray(responseData['data'])) {
            invoices = responseData['data'];
        }

        if (invoices.length === 0) {
            throw new nango.ActionError({
                type: 'no_invoice_created',
                message: 'No invoice was created'
            });
        }

        const createdInvoice = invoices[0];

        if (!createdInvoice || typeof createdInvoice !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_invoice_data',
                message: 'Invalid invoice data in response'
            });
        }

        const contactData = createdInvoice['Contact'];
        let contactId = '';
        let contactName = '';

        if (contactData && typeof contactData === 'object' && !Array.isArray(contactData)) {
            if ('ContactID' in contactData) {
                contactId = String(contactData['ContactID']);
            }
            if ('Name' in contactData) {
                contactName = String(contactData['Name']);
            }
        }

        const lineItemsData = createdInvoice['LineItems'];
        const mappedLineItems: Array<{
            line_item_id: string;
            description: string;
            quantity: number;
            unit_amount: number;
            account_code: string | null;
            tax_type: string | null;
            line_amount: number;
        }> = [];

        if (Array.isArray(lineItemsData)) {
            for (const item of lineItemsData) {
                if (item && typeof item === 'object') {
                    mappedLineItems.push({
                        line_item_id: item['LineItemID'] ? String(item['LineItemID']) : '',
                        description: item['Description'] ? String(item['Description']) : '',
                        quantity: typeof item['Quantity'] === 'number' ? item['Quantity'] : 0,
                        unit_amount: typeof item['UnitAmount'] === 'number' ? item['UnitAmount'] : 0,
                        account_code: item['AccountCode'] ? String(item['AccountCode']) : null,
                        tax_type: item['TaxType'] ? String(item['TaxType']) : null,
                        line_amount: typeof item['LineAmount'] === 'number' ? item['LineAmount'] : 0
                    });
                }
            }
        }

        return {
            invoice_id: createdInvoice['InvoiceID'] ? String(createdInvoice['InvoiceID']) : '',
            invoice_number: createdInvoice['InvoiceNumber'] ? String(createdInvoice['InvoiceNumber']) : '',
            type: createdInvoice['Type'] === 'ACCPAY' ? 'ACCPAY' : 'ACCREC',
            status: createdInvoice['Status'] ? String(createdInvoice['Status']) : '',
            total: typeof createdInvoice['Total'] === 'number' ? createdInvoice['Total'] : 0,
            sub_total: typeof createdInvoice['SubTotal'] === 'number' ? createdInvoice['SubTotal'] : 0,
            total_tax: typeof createdInvoice['TotalTax'] === 'number' ? createdInvoice['TotalTax'] : 0,
            contact_id: contactId,
            contact_name: contactName,
            date: createdInvoice['Date'] ? String(createdInvoice['Date']) : '',
            due_date: createdInvoice['DueDate'] ? String(createdInvoice['DueDate']) : null,
            updated_date_utc: createdInvoice['UpdatedDateUTC'] ? String(createdInvoice['UpdatedDateUTC']) : '',
            currency_code: createdInvoice['CurrencyCode'] ? String(createdInvoice['CurrencyCode']) : null,
            line_items: mappedLineItems
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
