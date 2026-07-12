import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const SupplierInvoiceSchema = z.object({
    id: z.number().int(),
    label: z.string().nullable().optional(),
    invoice_number: z.string().optional(),
    currency: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    currency_amount_before_tax: z.string().optional(),
    exchange_rate: z.string().optional(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    reconciled: z.boolean().optional(),
    accounting_status: z.string().optional(),
    filename: z.string().nullable().optional(),
    public_file_url: z.string().nullable().optional(),
    remaining_amount_with_tax: z.string().nullable().optional(),
    remaining_amount_without_tax: z.string().nullable().optional(),
    ledger_entry: z
        .object({
            id: z.number().int()
        })
        .optional(),
    supplier: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .nullable()
        .optional(),
    invoice_lines: z
        .object({
            url: z.string()
        })
        .optional(),
    categories: z
        .object({
            url: z.string()
        })
        .optional(),
    transaction_reference: z
        .object({
            banking_provider: z.string(),
            provider_field_name: z.string(),
            provider_field_value: z.string()
        })
        .nullable()
        .optional(),
    payment_status: z.string().optional(),
    paid: z.boolean().optional(),
    payments: z
        .object({
            url: z.string()
        })
        .optional(),
    matched_transactions: z
        .object({
            url: z.string()
        })
        .optional(),
    external_reference: z.string().optional(),
    e_invoicing: z
        .object({
            status: z.string().nullable().optional(),
            reason: z.string().nullable().optional(),
            flow: z
                .object({
                    id: z.string()
                })
                .nullable()
                .optional(),
            source_file_url: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(SupplierInvoiceSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List supplier invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getsupplierinvoices
        const response = await nango.get({
            endpoint: '/api/external/v2/supplier_invoices',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null || !Array.isArray(raw.items)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from supplier invoices endpoint'
            });
        }

        const validatedItems = z.array(SupplierInvoiceSchema).safeParse(raw.items);
        if (!validatedItems.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response items do not match expected schema',
                details: validatedItems.error.issues
            });
        }

        return {
            items: validatedItems.data,
            ...(raw.next_cursor != null && typeof raw.next_cursor === 'string' && { next_cursor: raw.next_cursor }),
            has_more: typeof raw.has_more === 'boolean' ? raw.has_more : false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
