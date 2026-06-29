import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100.'),
    date_from: z.string().optional().describe('Start date filter in YYYY-MM-DD format.'),
    date_to: z.string().optional().describe('End date filter in YYYY-MM-DD format.')
});

const PaymentAmountSchema = z
    .object({
        amount: z.string().optional(),
        code: z.string().optional()
    })
    .passthrough();

const PaymentSchema = z
    .object({
        id: z.number(),
        accounting_systemid: z.string().optional(),
        amount: PaymentAmountSchema.optional(),
        bulk_paymentid: z.number().nullable().optional(),
        creditid: z.number().nullable().optional(),
        clientid: z.number().optional(),
        date: z.string().optional(),
        from_credit: z.boolean().optional(),
        gateway: z.string().nullable().optional(),
        invoiceid: z.number().optional(),
        logid: z.number().optional(),
        note: z.string().optional(),
        orderid: z.number().nullable().optional(),
        overpaymentid: z.number().nullable().optional(),
        send_client_notification: z.boolean().nullable().optional(),
        transactionid: z.number().nullable().optional(),
        type: z.string().optional(),
        updated: z.string().optional(),
        vis_state: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    payments: z.array(PaymentSchema),
    next_cursor: z.string().optional(),
    page: z.number().optional(),
    pages: z.number().optional(),
    per_page: z.number().optional(),
    total: z.number().optional()
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const action = createAction({
    description: 'List payments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:payments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'Missing accountId in connection metadata. Run get-account-id first.'
            });
        }

        // https://www.freshbooks.com/api/payments
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/payments/payments`,
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.date_from !== undefined && { 'search[date_from]': input.date_from }),
                ...(input.date_to !== undefined && { 'search[date_to]': input.date_to })
            },
            retries: 3
        });

        const ListResponseSchema = z.object({
            response: z.object({
                result: z.object({
                    payments: z.array(PaymentSchema),
                    page: z.number(),
                    pages: z.number(),
                    per_page: z.number(),
                    total: z.number()
                })
            })
        });

        const parsed = ListResponseSchema.parse(response.data);
        const result = parsed.response.result;

        const next_cursor = result.page < result.pages ? String(result.page + 1) : undefined;

        return {
            payments: result.payments,
            next_cursor: next_cursor,
            page: result.page,
            pages: result.pages,
            per_page: result.per_page,
            total: result.total
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
