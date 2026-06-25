import { createSync } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z.object({
    id: z.string(),
    invoiceNumber: z.number().int().optional(),
    orderedBy: z.string().optional(),
    amountDC: z.number().optional(),
    status: z.number().int().optional(),
    modified: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z
                .object({
                    CurrentDivision: z.number().int()
                })
                .passthrough()
        )
    })
});

const PaginatedInvoiceSchema = z
    .object({
        InvoiceID: z.string().optional(),
        InvoiceNumber: z.number().int().nullish(),
        OrderedBy: z.string().nullish(),
        AmountDC: z.number().nullish(),
        Status: z.number().int().nullish(),
        Modified: z.string().nullish()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync sales invoices with incremental updates via Modified timestamp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sales-invoices'
        }
    ],
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNS-How-to-get-the-current-Division
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error('Failed to parse current division response');
        }

        const meResults = meParsed.data.d.results;
        const firstMe = meResults.at(0);
        if (!firstMe || firstMe.CurrentDivision === undefined) {
            throw new Error('Current division not found in response');
        }
        const division = firstMe.CurrentDivision;

        const params: Record<string, string> = {
            $select: 'InvoiceID,InvoiceNumber,OrderedBy,AmountDC,Status,Modified',
            $orderby: 'Modified asc'
        };
        if (updatedAfter) {
            params['$filter'] = `Modified gt datetime'${updatedAfter}'`;
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNS-Get-Sales-Invoices
        for await (const page of nango.paginate({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/salesinvoice/SalesInvoices`,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 60,
                response_path: 'd'
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const invoices: Array<z.infer<typeof InvoiceSchema>> = [];
            for (const raw of page) {
                const parsed = PaginatedInvoiceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error('Failed to parse sales invoice record');
                }

                const record = parsed.data;
                if (!record.InvoiceID) {
                    throw new Error('Missing InvoiceID in sales invoice record');
                }

                const invoice: z.infer<typeof InvoiceSchema> = {
                    id: record.InvoiceID
                };
                if (record.InvoiceNumber != null) {
                    invoice.invoiceNumber = record.InvoiceNumber;
                }
                if (record.OrderedBy != null) {
                    invoice.orderedBy = record.OrderedBy;
                }
                if (record.AmountDC != null) {
                    invoice.amountDC = record.AmountDC;
                }
                if (record.Status != null) {
                    invoice.status = record.Status;
                }
                if (record.Modified != null) {
                    invoice.modified = record.Modified;
                }
                invoices.push(invoice);
            }

            if (invoices.length === 0) {
                continue;
            }

            await nango.batchSave(invoices, 'Invoice');

            const lastInvoice = invoices.at(-1);
            if (lastInvoice?.modified) {
                await nango.saveCheckpoint({ updated_after: lastInvoice.modified });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
