import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ID: z.string().describe('Invoice ID. Example: "610d6972-6490-4947-bf59-6ebbe6237638"'),
    Description: z.string().optional().describe('Invoice description'),
    YourRef: z.string().optional().describe('Your reference'),
    Remarks: z.string().optional().describe('Remarks'),
    InvoiceDate: z.string().optional().describe('Invoice date in ISO format. Example: "2024-05-30"'),
    DueDate: z.string().optional().describe('Due date in ISO format. Example: "2024-06-30"'),
    OrderDate: z.string().optional().describe('Order date in ISO format. Example: "2024-05-30"')
});

const SalesInvoiceSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.number().nullable().optional(),
    Description: z.string().nullable().optional(),
    YourRef: z.string().nullable().optional(),
    Remarks: z.string().nullable().optional(),
    InvoiceDate: z.string().nullable().optional(),
    DueDate: z.string().nullable().optional(),
    OrderDate: z.string().nullable().optional(),
    Status: z.number().nullable().optional(),
    AmountDC: z.number().nullable().optional()
});

const OutputSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.number().nullable().optional(),
    Description: z.string().nullable().optional(),
    YourRef: z.string().nullable().optional(),
    Remarks: z.string().nullable().optional(),
    InvoiceDate: z.string().nullable().optional(),
    DueDate: z.string().nullable().optional(),
    OrderDate: z.string().nullable().optional(),
    Status: z.number().nullable().optional(),
    AmountDC: z.number().nullable().optional()
});

const action = createAction({
    description: 'Update a sales invoice (only Status 20 = Open invoices)',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-invoice'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SalesInvoice'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SystemSystemMe
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = z
            .object({
                d: z.union([
                    z.object({
                        results: z.array(
                            z.object({
                                CurrentDivision: z.number()
                            })
                        )
                    }),
                    z.object({
                        CurrentDivision: z.number()
                    })
                ])
            })
            .parse(meResponse.data);

        let division: number;
        if ('results' in meData.d) {
            const firstResult = meData.d.results[0];
            if (!firstResult) {
                throw new nango.ActionError({
                    type: 'division_not_found',
                    message: 'Could not determine current division from Me endpoint'
                });
            }
            division = firstResult.CurrentDivision;
        } else {
            division = meData.d.CurrentDivision;
        }

        const invoiceId = encodeURIComponent(input.ID);

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesInvoiceSalesInvoices
        const getResponse = await nango.get({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${invoiceId}')`,
            retries: 3
        });

        const getData = z
            .object({
                d: SalesInvoiceSchema
            })
            .parse(getResponse.data);

        const invoice = getData.d;

        if (invoice.Status !== 20) {
            throw new nango.ActionError({
                type: 'invalid_status',
                message: `Only invoices with Status 20 (Open) can be updated. Current status: ${invoice.Status}`
            });
        }

        const updateBody: Record<string, unknown> = {
            InvoiceID: input.ID
        };

        if (input.Description !== undefined) {
            updateBody['Description'] = input.Description;
        }
        if (input.YourRef !== undefined) {
            updateBody['YourRef'] = input.YourRef;
        }
        if (input.Remarks !== undefined) {
            updateBody['Remarks'] = input.Remarks;
        }
        if (input.InvoiceDate !== undefined) {
            updateBody['InvoiceDate'] = input.InvoiceDate;
        }
        if (input.DueDate !== undefined) {
            updateBody['DueDate'] = input.DueDate;
        }
        if (input.OrderDate !== undefined) {
            updateBody['OrderDate'] = input.OrderDate;
        }

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesInvoiceSalesInvoices
        await nango.put({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${invoiceId}')`,
            data: updateBody,
            retries: 1
        });

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesInvoiceSalesInvoices
        const confirmResponse = await nango.get({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${invoiceId}')`,
            retries: 3
        });

        const confirmData = z
            .object({
                d: SalesInvoiceSchema
            })
            .parse(confirmResponse.data);

        const updatedInvoice = confirmData.d;

        return {
            InvoiceID: updatedInvoice.InvoiceID,
            ...(updatedInvoice.InvoiceNumber != null && { InvoiceNumber: updatedInvoice.InvoiceNumber }),
            ...(updatedInvoice.Description != null && { Description: updatedInvoice.Description }),
            ...(updatedInvoice.YourRef != null && { YourRef: updatedInvoice.YourRef }),
            ...(updatedInvoice.Remarks != null && { Remarks: updatedInvoice.Remarks }),
            ...(updatedInvoice.InvoiceDate != null && { InvoiceDate: updatedInvoice.InvoiceDate }),
            ...(updatedInvoice.DueDate != null && { DueDate: updatedInvoice.DueDate }),
            ...(updatedInvoice.OrderDate != null && { OrderDate: updatedInvoice.OrderDate }),
            ...(updatedInvoice.Status != null && { Status: updatedInvoice.Status }),
            ...(updatedInvoice.AmountDC != null && { AmountDC: updatedInvoice.AmountDC })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
