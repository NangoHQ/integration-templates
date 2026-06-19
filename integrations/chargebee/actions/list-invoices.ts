import { z } from 'zod';
import { createAction } from 'nango';

const InvoiceSchema = z
    .object({
        id: z.string().describe('Invoice number. Example: "1"'),
        customer_id: z.string(),
        subscription_id: z.string().optional().nullable(),
        status: z.enum(['paid', 'posted', 'payment_due', 'not_paid', 'voided', 'pending']),
        date: z.number().optional().nullable(),
        due_date: z.number().optional().nullable(),
        total: z.number().optional().nullable(),
        amount_due: z.number().optional().nullable(),
        amount_paid: z.number().optional().nullable(),
        currency_code: z.string(),
        recurring: z.boolean(),
        deleted: z.boolean(),
        updated_at: z.number().optional().nullable(),
        resource_version: z.number().optional().nullable()
    })
    .passthrough();

const InputSchema = z.object({
    customer_id: z.string().optional().describe('Filter by customer ID. Example: "AzqOd0VMyUhHQZf4"'),
    subscription_id: z.string().optional().describe('Filter by subscription ID. Example: "AzZPdjVMyVrz9acf"'),
    status: z.string().optional().describe('Filter by status. Example: "payment_due"'),
    status_operator: z.enum(['is', 'is_not']).optional().describe('Status filter operator. Defaults to "is".'),
    date: z
        .object({
            gt: z.number().optional(),
            lt: z.number().optional(),
            gte: z.number().optional(),
            lte: z.number().optional()
        })
        .optional()
        .describe('Date range filter in Unix epoch seconds.'),
    updated_at: z
        .object({
            gt: z.number().optional(),
            lt: z.number().optional(),
            gte: z.number().optional(),
            lte: z.number().optional()
        })
        .optional()
        .describe('Updated-at range filter in Unix epoch seconds.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.')
});

const OutputSchema = z.object({
    invoices: z.array(InvoiceSchema),
    next_offset: z.string().optional()
});

const ListResponseSchema = z.object({
    list: z.array(
        z.object({
            invoice: z.unknown()
        })
    ),
    next_offset: z.union([z.string(), z.number()]).optional().nullable()
});

const action = createAction({
    description: 'List invoices with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    endpoint: {
        method: 'GET',
        path: '/actions/list-invoices'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 100
        };

        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }

        if (input.subscription_id !== undefined) {
            params['subscription_id'] = input.subscription_id;
        }

        if (input.status !== undefined) {
            const operator = input.status_operator ?? 'is';
            params[`status[${operator}]`] = input.status;
        }

        if (input.date !== undefined) {
            if (input.date.gt !== undefined) {
                params['date[gt]'] = input.date.gt;
            }
            if (input.date.lt !== undefined) {
                params['date[lt]'] = input.date.lt;
            }
            if (input.date.gte !== undefined) {
                params['date[gte]'] = input.date.gte;
            }
            if (input.date.lte !== undefined) {
                params['date[lte]'] = input.date.lte;
            }
        }

        if (input.updated_at !== undefined) {
            if (input.updated_at.gt !== undefined) {
                params['updated_at[gt]'] = input.updated_at.gt;
            }
            if (input.updated_at.lt !== undefined) {
                params['updated_at[lt]'] = input.updated_at.lt;
            }
            if (input.updated_at.gte !== undefined) {
                params['updated_at[gte]'] = input.updated_at.gte;
            }
            if (input.updated_at.lte !== undefined) {
                params['updated_at[lte]'] = input.updated_at.lte;
            }
        }

        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/invoices
            endpoint: '/api/v2/invoices',
            params,
            retries: 3
        });

        const rawData = ListResponseSchema.parse(response.data);
        const invoices = rawData.list.map((item) => InvoiceSchema.parse(item.invoice));

        return {
            invoices,
            ...(rawData.next_offset != null && {
                next_offset: String(rawData.next_offset)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
