import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string(),
    quantity: z.number(),
    unit_amount: z.number(),
    account_code: z.string(),
    item_code: z.string().optional(),
    tax_type: z.string().optional()
});

const InputSchema = z.object({
    type: z.enum(['ACCREC', 'ACCPAY']),
    contact_id: z.string(),
    date: z.string(),
    due_date: z.string().optional(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED']).optional(),
    reference: z.string().optional(),
    line_items: z.array(LineItemInputSchema)
});

const XeroContactSchema = z.object({
    ContactID: z.string()
});

const XeroLineItemSchema = z.object({
    Description: z.string(),
    Quantity: z.number(),
    UnitAmount: z.number(),
    AccountCode: z.string(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional()
});

const XeroInvoiceSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.string().optional(),
    Type: z.string(),
    Status: z.string(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Reference: z.string().optional(),
    Contact: XeroContactSchema,
    LineItems: z.array(XeroLineItemSchema).optional(),
    Total: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional()
});

const XeroInvoicesResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    Invoices: z.array(XeroInvoiceSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    invoice_number: z.string().optional(),
    type: z.string(),
    status: z.string(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    reference: z.string().optional(),
    contact_id: z.string(),
    line_items: z
        .array(
            z.object({
                description: z.string(),
                quantity: z.number(),
                unit_amount: z.number(),
                account_code: z.string(),
                item_code: z.string().optional(),
                tax_type: z.string().optional()
            })
        )
        .optional(),
    total: z.number().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional()
});

const action = createAction({
    description: 'Create a sales or purchase invoice.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = z.record(z.string(), z.unknown()).parse(connection.connection_config || {});
        let tenantId: string | undefined = undefined;

        if (typeof connectionConfig === 'object' && connectionConfig !== null && 'tenant_id' in connectionConfig) {
            const maybe = connectionConfig['tenant_id'];
            if (typeof maybe === 'string') {
                tenantId = maybe;
            }
        }

        if (!tenantId) {
            const metadata = await nango.getMetadata();
            const metadataRecord = z.record(z.string(), z.unknown()).parse(metadata || {});
            if (typeof metadataRecord === 'object' && metadataRecord !== null && 'tenantId' in metadataRecord) {
                const maybe = metadataRecord['tenantId'];
                if (typeof maybe === 'string') {
                    tenantId = maybe;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connectionsData = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);
            const connections = connectionsData.filter((c) => typeof c === 'object' && c !== null && 'tenantId' in c && typeof c['tenantId'] === 'string');
            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found on this connection.'
                });
            }
            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const first = connections[0];
            if (first && typeof first['tenantId'] === 'string') {
                tenantId = first['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const payload = {
            Invoices: [
                {
                    Type: input.type,
                    Contact: {
                        ContactID: input.contact_id
                    },
                    Date: input.date,
                    ...(input.due_date !== undefined && { DueDate: input.due_date }),
                    ...(input.status !== undefined && { Status: input.status }),
                    ...(input.reference !== undefined && { Reference: input.reference }),
                    LineItems: input.line_items.map((item) => ({
                        Description: item.description,
                        Quantity: item.quantity,
                        UnitAmount: item.unit_amount,
                        AccountCode: item.account_code,
                        ...(item.item_code !== undefined && { ItemCode: item.item_code }),
                        ...(item.tax_type !== undefined && { TaxType: item.tax_type })
                    }))
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: payload,
            retries: 3
        });

        const parsed = XeroInvoicesResponseSchema.parse(response.data);
        const invoice = parsed.Invoices[0];

        if (!invoice) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Invoice creation failed: no invoice returned.'
            });
        }

        return {
            id: invoice.InvoiceID,
            ...(invoice.InvoiceNumber !== undefined && { invoice_number: invoice.InvoiceNumber }),
            type: invoice.Type,
            status: invoice.Status,
            ...(invoice.Date !== undefined && { date: invoice.Date }),
            ...(invoice.DueDate !== undefined && { due_date: invoice.DueDate }),
            ...(invoice.Reference !== undefined && { reference: invoice.Reference }),
            contact_id: invoice.Contact.ContactID,
            ...(invoice.LineItems !== undefined && {
                line_items: invoice.LineItems.map((item) => ({
                    description: item.Description,
                    quantity: item.Quantity,
                    unit_amount: item.UnitAmount,
                    account_code: item.AccountCode,
                    ...(item.ItemCode !== undefined && { item_code: item.ItemCode }),
                    ...(item.TaxType !== undefined && { tax_type: item.TaxType })
                }))
            }),
            ...(invoice.Total !== undefined && { total: invoice.Total }),
            ...(invoice.SubTotal !== undefined && { sub_total: invoice.SubTotal }),
            ...(invoice.TotalTax !== undefined && { total_tax: invoice.TotalTax })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
