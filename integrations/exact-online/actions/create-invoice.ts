import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ordered_by: z.string().describe('Customer account GUID. Example: a58c29d9-ef92-40f1-b817-31b36990898c'),
    invoice_date: z.string().optional().describe('Invoice date in ISO format. Example: 2024-05-30'),
    description: z.string().optional().describe('Invoice description'),
    sales_invoice_lines: z
        .array(
            z
                .object({
                    item: z.string().optional().describe('Item GUID'),
                    gl_account: z.string().optional().describe('GL Account GUID'),
                    quantity: z.number(),
                    net_price: z.number(),
                    description: z.string().optional(),
                    vat_code: z.string().optional().describe('VAT code. Example: VN')
                })
                .refine((line) => line.item !== undefined || line.gl_account !== undefined, {
                    message: 'Each line must have either item or gl_account'
                })
        )
        .min(1, { message: 'At least one sales invoice line is required' })
});

const OutputSchema = z.object({
    id: z.string(),
    invoice_number: z.number().optional(),
    ordered_by: z.string().optional(),
    status: z.number().optional(),
    description: z.string().optional(),
    invoice_date: z.string().optional(),
    sales_invoice_lines: z
        .array(
            z.object({
                id: z.string().optional(),
                item: z.string().optional(),
                gl_account: z.string().optional(),
                quantity: z.number().optional(),
                net_price: z.number().optional(),
                description: z.string().optional()
            })
        )
        .optional()
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.number().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const CreateInvoiceResponseSchema = z.object({
    d: z
        .object({
            __metadata: z
                .object({
                    uri: z.string().optional()
                })
                .optional(),
            ID: z.string().nullable().optional(),
            InvoiceID: z.string().nullable().optional(),
            EntryID: z.string().nullable().optional()
        })
        .optional()
});

const InvoiceGetSchema = z.object({
    d: z
        .object({
            ID: z.string().optional(),
            InvoiceID: z.string().optional(),
            EntryID: z.string().optional(),
            InvoiceNumber: z.number().nullable().optional(),
            OrderedBy: z.string().optional(),
            Status: z.number().optional(),
            Description: z.string().nullable().optional(),
            InvoiceDate: z.string().optional(),
            SalesInvoiceLines: z
                .object({
                    results: z
                        .array(
                            z.object({
                                ID: z.string().optional(),
                                Item: z.string().optional(),
                                GLAccount: z.string().optional(),
                                Quantity: z.number().optional(),
                                NetPrice: z.number().optional(),
                                Description: z.string().nullable().optional()
                            })
                        )
                        .optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a new sales invoice.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SalesInvoices'],
    endpoint: {
        method: 'POST',
        path: '/actions/create-invoice'
    },
    exec: async (nango, input) => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-docs
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const division = meData.d?.results?.[0]?.CurrentDivision;

        if (!division) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        const salesInvoiceLines = input.sales_invoice_lines.map((line) => {
            const mapped: Record<string, unknown> = {
                Quantity: line.quantity,
                NetPrice: line.net_price
            };

            if (line.item !== undefined) {
                mapped['Item'] = line.item;
            }

            if (line.gl_account !== undefined) {
                mapped['GLAccount'] = line.gl_account;
            }

            if (line.description !== undefined) {
                mapped['Description'] = line.description;
            }

            if (line.vat_code !== undefined) {
                mapped['VATCode'] = line.vat_code;
            }

            return mapped;
        });

        const invoiceBody: Record<string, unknown> = {
            OrderedBy: input.ordered_by,
            Status: 20,
            Journal: '70',
            Type: 8023,
            Warehouse: 'e4f7592d-dd76-4c75-b957-9fbeaf9dbe55',
            SalesInvoiceLines: salesInvoiceLines
        };

        if (input.invoice_date !== undefined) {
            invoiceBody['InvoiceDate'] = input.invoice_date;
            invoiceBody['OrderDate'] = input.invoice_date;
        }

        if (input.description !== undefined) {
            invoiceBody['Description'] = input.description;
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-docs
        const createResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(division)}/salesinvoice/SalesInvoices`,
            data: invoiceBody,
            retries: 1
        });

        const createdData = CreateInvoiceResponseSchema.parse(createResponse.data);
        const createdD = createdData.d;

        if (!createdD) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create invoice: no response data'
            });
        }

        let createdId = createdD.InvoiceID || createdD.ID;

        if (!createdId && createdD.__metadata?.uri) {
            const uri = createdD.__metadata.uri;
            const match = uri.match(/\('([^']+)'\)/);
            if (match) {
                createdId = match[1];
            }
        }

        if (!createdId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Could not determine created invoice ID from response'
            });
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-docs
        const getResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/salesinvoice/SalesInvoices(guid'${encodeURIComponent(createdId)}')`,
            params: {
                $expand: 'SalesInvoiceLines'
            },
            retries: 3
        });

        const getData = InvoiceGetSchema.parse(getResponse.data);
        const invoice = getData.d;

        if (!invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Created invoice not found when fetching'
            });
        }

        const lines =
            invoice.SalesInvoiceLines?.results?.map((line) => {
                const mapped: { id?: string; item?: string; gl_account?: string; quantity?: number; net_price?: number; description?: string } = {};

                if (line.ID !== undefined) {
                    mapped.id = line.ID;
                }

                if (line.Item !== undefined) {
                    mapped.item = line.Item;
                }

                if (line.GLAccount !== undefined) {
                    mapped.gl_account = line.GLAccount;
                }

                if (line.Quantity !== undefined) {
                    mapped.quantity = line.Quantity;
                }

                if (line.NetPrice !== undefined) {
                    mapped.net_price = line.NetPrice;
                }

                if (line.Description != null) {
                    mapped.description = line.Description;
                }

                return mapped;
            }) || [];

        return {
            id: invoice['ID'] || invoice['InvoiceID'] || createdId,
            ...(invoice['InvoiceNumber'] != null && { invoice_number: invoice['InvoiceNumber'] }),
            ...(invoice['OrderedBy'] !== undefined && { ordered_by: invoice['OrderedBy'] }),
            ...(invoice['Status'] !== undefined && { status: invoice['Status'] }),
            ...(invoice['Description'] != null && { description: invoice['Description'] }),
            ...(invoice['InvoiceDate'] !== undefined && { invoice_date: invoice['InvoiceDate'] }),
            ...(lines.length > 0 && { sales_invoice_lines: lines })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
