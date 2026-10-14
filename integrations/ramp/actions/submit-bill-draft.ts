import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        draft_bill_id: z.string().describe('Unique identifier of the draft bill to submit. Example: "faaf5154-3ef7-49e4-986d-acdd5be2b9ec"')
    })
    .describe('Input for submitting a draft bill into the approval/payment pipeline.');

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest denomination of the currency, e.g. cents for USD. Example: 100000'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z.number().int().optional().describe('Divisor that converts amount into the major currency unit; 100 for USD.')
});

const BillVendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor.'),
    name: z.string().describe('Name of the vendor. Example: "Figma"'),
    type: z.string().optional().describe('Vendor type. Example: "BUSINESS"')
});

const BillOwnerSchema = z.object({
    id: z.string().describe('Unique identifier of the Ramp user who owns the bill.'),
    first_name: z.string().optional().describe('First name of the bill owner.'),
    last_name: z.string().optional().describe('Last name of the bill owner.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the submitted bill. Reuses the submitted draft bill ID.'),
        draft_bill_id: z.string().optional().describe('Identifier of the draft bill this bill was created from.'),
        status: z.string().describe('Bill status. Example: "OPEN"'),
        status_summary: z.string().optional().describe('Detailed status of the bill within the approval/payment pipeline. Example: "APPROVAL_PENDING"'),
        approval_status: z.string().optional().describe('Current approval state of the bill. Example: "PENDING"'),
        sync_status: z.string().optional().describe('Accounting sync state of the bill. Example: "NOT_SYNCED"'),
        amount: CurrencyAmountSchema.describe('Total amount of the bill.'),
        vendor: BillVendorSchema.describe('Vendor the bill is payable to.'),
        bill_owner: BillOwnerSchema.optional().describe('Ramp user who owns the bill.'),
        invoice_number: z.string().optional().describe('Invoice number supplied on the draft bill.'),
        issued_at: z.string().optional().describe('Date the bill was issued. Example: "2026-10-14"'),
        due_at: z.string().optional().describe('Date the bill is due. Example: "2026-11-14"'),
        accounting_date: z.string().optional().describe('Accounting date assigned to the bill.'),
        created_at: z.string().optional().describe('Timestamp at which the bill was submitted.'),
        deep_link_url: z.string().optional().describe('URL to view the bill in the Ramp dashboard.')
    })
    .describe('The bill created by submitting the draft bill.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const ProviderBillVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().nullable().optional()
});

const ProviderBillOwnerSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional()
});

const ProviderBillSchema = z.object({
    id: z.string(),
    draft_bill_id: z.string().nullable().optional(),
    status: z.string(),
    status_summary: z.string().nullable().optional(),
    approval_status: z.string().nullable().optional(),
    sync_status: z.string().nullable().optional(),
    amount: ProviderCurrencyAmountSchema,
    vendor: ProviderBillVendorSchema,
    bill_owner: ProviderBillOwnerSchema.nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    issued_at: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    accounting_date: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    deep_link_url: z.string().nullable().optional()
});

/**
 * @tags: [write]
 * @tagReason: Submits a draft bill, moving it into the normal approval and payment pipeline as a live bill.
 * @pitfalls: Requires a complete draft (issue date, due date, invoice currency, payment method, and payee contact) or the provider rejects the submission; it then permanently consumes the draft, the returned bill reuses the draft's identifier, and it starts in APPROVAL_PENDING rather than payable.
 */
const action = createAction({
    description: 'Submit a previously-created draft bill into the normal approval/payment pipeline.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/api/bills
            endpoint: `/developer/v1/bills/drafts/${encodeURIComponent(input.draft_bill_id)}/submit`,
            // Submitting a draft is not idempotent: a retry after a lost response could act on an already-consumed draft.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const bill = ProviderBillSchema.parse(response.data);

        return {
            id: bill.id,
            ...(bill.draft_bill_id != null && { draft_bill_id: bill.draft_bill_id }),
            status: bill.status,
            ...(bill.status_summary != null && { status_summary: bill.status_summary }),
            ...(bill.approval_status != null && { approval_status: bill.approval_status }),
            ...(bill.sync_status != null && { sync_status: bill.sync_status }),
            amount: {
                amount: bill.amount.amount,
                currency_code: bill.amount.currency_code,
                ...(bill.amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: bill.amount.minor_unit_conversion_rate })
            },
            vendor: {
                id: bill.vendor.id,
                name: bill.vendor.name,
                ...(bill.vendor.type != null && { type: bill.vendor.type })
            },
            ...(bill.bill_owner != null && {
                bill_owner: {
                    id: bill.bill_owner.id,
                    ...(bill.bill_owner.first_name != null && { first_name: bill.bill_owner.first_name }),
                    ...(bill.bill_owner.last_name != null && { last_name: bill.bill_owner.last_name })
                }
            }),
            ...(bill.invoice_number != null && { invoice_number: bill.invoice_number }),
            ...(bill.issued_at != null && { issued_at: bill.issued_at }),
            ...(bill.due_at != null && { due_at: bill.due_at }),
            ...(bill.accounting_date != null && { accounting_date: bill.accounting_date }),
            ...(bill.created_at != null && { created_at: bill.created_at }),
            ...(bill.deep_link_url != null && { deep_link_url: bill.deep_link_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
