import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoiceDateFrom: z.string().describe('From and including. Example: "2024-01-01"'),
    invoiceDateTo: z.string().describe('To and excluding. Example: "2024-12-31"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        url: z.string().optional(),
        invoiceNumber: z.number().optional(),
        invoiceDate: z.string().optional(),
        invoiceDueDate: z.string().optional(),
        kid: z.string().optional(),
        invoiceComment: z.string().optional(),
        comment: z.string().optional(),
        amount: z.number().optional(),
        amountCurrency: z.number().optional(),
        amountExcludingVat: z.number().optional(),
        amountExcludingVatCurrency: z.number().optional(),
        isCreditNote: z.boolean().optional(),
        isCharged: z.boolean().optional(),
        isApproved: z.boolean().optional(),
        customer: z
            .object({
                id: z.number().optional(),
                name: z.string().optional()
            })
            .optional(),
        currency: z
            .object({
                id: z.number().optional(),
                code: z.string().optional()
            })
            .optional(),
        orders: z.array(z.unknown()).optional(),
        orderLines: z.array(z.unknown()).optional(),
        voucher: z.unknown().optional(),
        postings: z.array(z.unknown()).optional(),
        reminders: z.array(z.unknown()).optional(),
        travelReports: z.array(z.unknown()).optional(),
        projectInvoiceDetails: z.array(z.unknown()).optional(),
        creditedInvoice: z.number().optional(),
        isCredited: z.boolean().optional(),
        deliveryDate: z.string().optional(),
        amountRoundoff: z.number().optional(),
        amountRoundoffCurrency: z.number().optional(),
        amountOutstanding: z.number().optional(),
        amountCurrencyOutstanding: z.number().optional(),
        amountOutstandingTotal: z.number().optional(),
        amountCurrencyOutstandingTotal: z.number().optional(),
        sumRemits: z.number().optional(),
        paymentTypeId: z.number().optional(),
        paidAmount: z.number().optional(),
        isPeriodizationPossible: z.boolean().optional(),
        documentId: z.number().optional(),
        ehfSendStatus: z.string().optional(),
        invoiceRemarks: z.string().optional(),
        invoiceRemark: z.unknown().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    fullResultSize: z.number().optional(),
    from: z.number().optional(),
    count: z.number().optional(),
    versionDigest: z.string().optional(),
    values: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(ProviderInvoiceSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List invoices within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const from = input.cursor ? Number(input.cursor) : 0;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/invoice',
            params: {
                invoiceDateFrom: input.invoiceDateFrom,
                invoiceDateTo: input.invoiceDateTo,
                from: from,
                count: 100
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const items = listResponse.values.map((item) => ProviderInvoiceSchema.parse(item));

        const currentFrom = listResponse.from ?? 0;
        const currentCount = listResponse.count ?? items.length;
        const nextFrom = currentFrom + currentCount;
        const hasMore = items.length === 100;

        return {
            items,
            ...(hasMore && { nextCursor: String(nextFrom) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
