import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill whose hold should be released. Example: "93d8436a-1cc7-596b-ace0-7c69f5bcb5ce".')
    })
    .describe('Input identifying the Ramp bill whose hold should be released.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 125000.'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".')
});

const BillVendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor. Example: "ece8d100-7737-4b28-abe8-d9afa74a921d".'),
    name: z.string().describe('Display name of the vendor. Example: "Salesforce".')
});

const ProviderBillSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_summary: z.string(),
    amount: z.object({
        amount: z.number(),
        currency_code: z.string()
    }),
    vendor: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .nullable()
        .optional(),
    memo: z.string().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    issued_at: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    approval_status: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bill.'),
        status: z.string().describe('Bill status after the hold was released. Example: "OPEN".'),
        status_summary: z.string().describe('Detailed bill state after the hold was released. Example: "WAITING_FOR_TRANSFER_MATCH".'),
        amount: CurrencyAmountSchema.describe('Total amount of the bill.'),
        vendor: BillVendorSchema.optional().describe('Vendor the bill is owed to, when present.'),
        memo: z.string().optional().describe('Free-text memo on the bill, when present.'),
        invoice_number: z.string().optional().describe('Invoice number on the bill, when present.'),
        issued_at: z.string().optional().describe('ISO 8601 date the bill was issued, when present.'),
        due_at: z.string().optional().describe('ISO 8601 date the bill is due, when present.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp the bill was created, when present.'),
        approval_status: z.string().optional().describe('Approval status of the bill, when set. Example: "APPROVED".')
    })
    .describe('The bill after its hold was released.');

/**
 * @tags: [write]
 * @tagReason: Releases a payment hold on a bill, mutating its provider-side state.
 * @pitfalls: Only a bill that is currently on hold can be released; releasing any other bill fails with a 400 error, and a successful release merely restores the bill's prior payment state rather than paying it.
 */
const action = createAction({
    description: 'Remove a hold previously placed on a bill.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/api/bills
        const response = await nango.post({
            endpoint: `/developer/v1/bills/${encodeURIComponent(input.bill_id)}/release`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- release is not idempotent, so retries must stay at 0
            retries: 0
        });

        const bill = ProviderBillSchema.parse(response.data);

        return {
            id: bill.id,
            status: bill.status,
            status_summary: bill.status_summary,
            amount: {
                amount: bill.amount.amount,
                currency_code: bill.amount.currency_code
            },
            ...(bill.vendor != null && { vendor: { id: bill.vendor.id, name: bill.vendor.name } }),
            ...(bill.memo != null && { memo: bill.memo }),
            ...(bill.invoice_number != null && { invoice_number: bill.invoice_number }),
            ...(bill.issued_at != null && { issued_at: bill.issued_at }),
            ...(bill.due_at != null && { due_at: bill.due_at }),
            ...(bill.created_at != null && { created_at: bill.created_at }),
            ...(bill.approval_status != null && { approval_status: bill.approval_status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
