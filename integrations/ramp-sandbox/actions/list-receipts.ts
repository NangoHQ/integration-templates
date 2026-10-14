import { z } from 'zod';
import { createAction } from 'nango';

const OcrLineItemSchema = z.object({
    item_name: z.string().nullable().optional(),
    item_date: z.string().nullable().optional(),
    item_quantity: z.number().nullable().optional(),
    item_unit_price: z.number().nullable().optional(),
    item_total_price: z.number().nullable().optional()
});

const OcrTaxSchema = z.object({
    tax_name: z.string().nullable().optional(),
    tax_amount: z.number().nullable().optional(),
    tax_rate: z.number().nullable().optional()
});

const OcrSchema = z.object({
    currency_code: z.string().nullable().optional(),
    line_items: z.array(OcrLineItemSchema).optional(),
    taxes: z.array(OcrTaxSchema).optional()
});

const PublicOcrSchema = z.object({
    currency_code: z.string().optional().describe('ISO 4217 currency code extracted from the receipt, when OCR could determine it.'),
    line_items: z
        .array(
            z.object({
                item_name: z.string().optional().describe('Name of the extracted line item.'),
                item_date: z.string().optional().describe('Date of the extracted line item in YYYY-MM-DD format.'),
                item_quantity: z.number().optional().describe('Quantity of the extracted line item.'),
                item_unit_price: z.number().optional().describe('Unit price of the extracted line item.'),
                item_total_price: z.number().optional().describe('Total price of the extracted line item.')
            })
        )
        .optional()
        .describe('Line items extracted from the receipt by OCR.'),
    taxes: z
        .array(
            z.object({
                tax_name: z.string().optional().describe('Name of the extracted tax.'),
                tax_amount: z.number().optional().describe('Amount of the extracted tax.'),
                tax_rate: z.number().optional().describe('Rate of the extracted tax.')
            })
        )
        .optional()
        .describe('Taxes extracted from the receipt by OCR.')
});

const ReceiptSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the receipt.'),
    user_id: z.string().optional().describe('ID of the user who uploaded the receipt.'),
    transaction_id: z.string().optional().describe('ID of the transaction the receipt is attached to, when the receipt belongs to a card transaction.'),
    reimbursement_id: z.string().optional().describe('ID of the reimbursement the receipt is attached to, when the receipt belongs to a reimbursement.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the receipt was created.'),
    receipt_url: z.string().describe('Time-limited pre-signed URL to the receipt image or PDF.'),
    ocr: PublicOcrSchema.optional().describe(
        'Structured data extracted from the receipt by OCR, present only when include_ocr_data is true and OCR data exists.'
    )
});

const InputSchema = z
    .object({
        transaction_id: z.string().optional().describe('Only return receipts attached to this transaction ID.'),
        reimbursement_id: z.string().optional().describe('Only return receipts attached to this reimbursement ID.'),
        created_after: z.string().optional().describe('Only return receipts created after this ISO 8601 datetime, e.g. "2026-01-01T00:00:00Z".'),
        created_before: z.string().optional().describe('Only return receipts created before this ISO 8601 datetime, e.g. "2026-01-01T00:00:00Z".'),
        from_date: z.string().optional().describe('Only return receipts on or after this ISO 8601 datetime, e.g. "2026-01-01T00:00:00Z".'),
        to_date: z.string().optional().describe('Only return receipts on or before this ISO 8601 datetime, e.g. "2026-01-01T00:00:00Z".'),
        include_ocr_data: z.boolean().optional().describe('When true, include structured OCR data extracted from each receipt.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of receipts to return per page (between 2 and 100). Defaults to 20.'),
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.')
    })
    .describe('Filters for listing Ramp receipts.');

const OutputSchema = z
    .object({
        items: z.array(ReceiptSchema).describe('Receipts returned for this page.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass back as cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of Ramp receipts with an optional cursor for the next page.');

const ProviderReceiptSchema = z.object({
    id: z.string().optional(),
    user_id: z.string().optional(),
    transaction_id: z.string().optional(),
    reimbursement_id: z.string().optional(),
    created_at: z.string().optional(),
    receipt_url: z.string(),
    ocr: OcrSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderReceiptSchema),
    page: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const normalizeOcr = (ocr: z.infer<typeof OcrSchema>): z.infer<typeof PublicOcrSchema> => ({
    ...(ocr.currency_code != null && { currency_code: ocr.currency_code }),
    ...(ocr.line_items != null && {
        line_items: ocr.line_items.map((item) => ({
            ...(item.item_name != null && { item_name: item.item_name }),
            ...(item.item_date != null && { item_date: item.item_date }),
            ...(item.item_quantity != null && { item_quantity: item.item_quantity }),
            ...(item.item_unit_price != null && { item_unit_price: item.item_unit_price }),
            ...(item.item_total_price != null && { item_total_price: item.item_total_price })
        }))
    }),
    ...(ocr.taxes != null && {
        taxes: ocr.taxes.map((tax) => ({
            ...(tax.tax_name != null && { tax_name: tax.tax_name }),
            ...(tax.tax_amount != null && { tax_amount: tax.tax_amount }),
            ...(tax.tax_rate != null && { tax_rate: tax.tax_rate })
        }))
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads receipt records from Ramp; it does not create, update, or delete any provider resource.
 * @pitfalls: receipt_url is a short-lived pre-signed URL, so download the file promptly instead of storing the URL; created_after, created_before, from_date, and to_date require a full ISO 8601 datetime and reject a bare date.
 */
const action = createAction({
    description: 'List receipt images/PDFs, optionally filtered by transaction or reimbursement.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/receipts
            endpoint: '/developer/v1/receipts',
            params: {
                ...(input.transaction_id !== undefined && { transaction_id: input.transaction_id }),
                ...(input.reimbursement_id !== undefined && { reimbursement_id: input.reimbursement_id }),
                ...(input.created_after !== undefined && { created_after: input.created_after }),
                ...(input.created_before !== undefined && { created_before: input.created_before }),
                ...(input.from_date !== undefined && { from_date: input.from_date }),
                ...(input.to_date !== undefined && { to_date: input.to_date }),
                ...(input.include_ocr_data !== undefined && { include_ocr_data: String(input.include_ocr_data) }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((receipt) => ({
            ...(receipt.id !== undefined && { id: receipt.id }),
            ...(receipt.user_id !== undefined && { user_id: receipt.user_id }),
            ...(receipt.transaction_id !== undefined && { transaction_id: receipt.transaction_id }),
            ...(receipt.reimbursement_id !== undefined && { reimbursement_id: receipt.reimbursement_id }),
            ...(receipt.created_at !== undefined && { created_at: receipt.created_at }),
            receipt_url: receipt.receipt_url,
            ...(receipt.ocr != null && { ocr: normalizeOcr(receipt.ocr) })
        }));

        let next_cursor: string | undefined;
        const next = parsed.page?.next;
        if (next != null) {
            const start = new URL(next).searchParams.get('start');
            if (start) {
                next_cursor = start;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
