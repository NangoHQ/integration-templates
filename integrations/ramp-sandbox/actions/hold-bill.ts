import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 100 equals $1.00'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"')
});

const ProviderBillSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_summary: z.string(),
    amount: CurrencyAmountSchema,
    due_at: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    vendor: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            type: z.string().nullable().optional()
        })
        .optional()
});

const InputSchema = z
    .object({
        bill_id: z.string().describe('ID of the bill to place on hold. Example: "6e3816e3-0e53-42ae-b075-bdb0adff10c4"'),
        reason: z.string().optional().describe('Optional reason recorded when placing the bill on hold. Example: "Awaiting additional review"')
    })
    .describe('Input for placing a hold on a bill.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the bill that was placed on hold.'),
        status: z.string().describe('Overall bill status after the hold: "OPEN" or "PAID".'),
        status_summary: z.string().describe('Detailed bill status after the hold; becomes "ON_HOLD" when the hold is applied.'),
        amount: z
            .object({
                amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 100 equals $1.00'),
                currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"')
            })
            .describe('Total amount of the bill.'),
        due_at: z.string().optional().describe('Due date of the bill in ISO 8601 format. Example: "2026-11-15T00:00:00+00:00"'),
        memo: z.string().optional().describe('Memo recorded on the bill, if any.'),
        vendor: z
            .object({
                id: z.string().optional().describe('ID of the vendor associated with the bill.'),
                name: z.string().optional().describe('Name of the vendor associated with the bill. Example: "Figma"'),
                type: z.string().optional().describe('Vendor type: "BUSINESS" or "INDIVIDUAL".')
            })
            .optional()
            .describe('Vendor associated with the bill, if present.')
    })
    .describe('The bill after the hold was applied.');

/**
 * @tags: [write]
 * @tagReason: Places a hold on a bill, mutating the provider bill state by blocking payment rails and descheduling payments.
 * @pitfalls: Only open, unpaid bills can be held; the provider rejects holds on already-paid or already-held bills. Releasing a hold requires the separate release operation.
 */
const action = createAction({
    description: 'Place a hold on a bill, pausing any pending payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/api/bills
            endpoint: `/developer/v1/bills/${encodeURIComponent(input.bill_id)}/hold`,
            data: {
                ...(input.reason !== undefined && { reason: input.reason })
            },
            // Placing a hold is a non-idempotent state change; a retry after a lost response could fail or double-apply.
            retries: 10
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
            ...(bill.due_at != null && { due_at: bill.due_at }),
            ...(bill.memo != null && { memo: bill.memo }),
            ...(bill.vendor != null && {
                vendor: {
                    ...(bill.vendor.id != null && { id: bill.vendor.id }),
                    ...(bill.vendor.name != null && { name: bill.vendor.name }),
                    ...(bill.vendor.type != null && { type: bill.vendor.type })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
