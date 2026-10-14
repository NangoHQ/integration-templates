import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const OcrLineItemSchema = z.object({
    item_name: z.string().nullable().optional().describe('Name of the line item extracted from the receipt image, or null when OCR could not extract it.'),
    item_date: z.string().nullable().optional().describe('Date associated with the line item (YYYY-MM-DD), or null when OCR could not extract it.'),
    item_quantity: z.number().nullable().optional().describe('Quantity of the line item, or null when OCR could not extract it.'),
    item_unit_price: z.number().nullable().optional().describe('Unit price of the line item, or null when OCR could not extract it.'),
    item_total_price: z.number().nullable().optional().describe('Total price of the line item, or null when OCR could not extract it.')
});

const OcrTaxSchema = z.object({
    tax_name: z.string().nullable().optional().describe('Name of the tax extracted from the receipt image, or null when OCR could not extract it.'),
    tax_rate: z.number().nullable().optional().describe('Tax rate extracted from the receipt image, or null when OCR could not extract it.'),
    tax_amount: z.number().nullable().optional().describe('Tax amount extracted from the receipt image, or null when OCR could not extract it.')
});

const OcrSchema = z.object({
    currency_code: z.string().nullable().optional().describe('Currency code extracted from the receipt image, or null when OCR could not extract it.'),
    line_items: z.array(OcrLineItemSchema).optional().describe('Line items extracted from the receipt image.'),
    taxes: z.array(OcrTaxSchema).optional().describe('Taxes extracted from the receipt image.')
});

const InputSchema = z
    .object({
        receipt_id: z.string().describe('Unique identifier of the receipt to retrieve. Example: "9550988c-52d9-495a-879f-a845ff0e8866".'),
        include_ocr_data: z
            .boolean()
            .optional()
            .describe('When true, include structured OCR data (currency code, line items, taxes) extracted from the receipt image. Defaults to false.')
    })
    .describe('Identifies which receipt to fetch and whether to include its OCR data.');

const ProviderReceiptSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    receipt_url: z.string(),
    transaction_id: z.string().optional(),
    reimbursement_id: z.string().optional(),
    user_id: z.string().optional(),
    ocr: OcrSchema.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the receipt.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the receipt was created.'),
        receipt_url: z.string().describe('Pre-signed URL to download the receipt image, valid for about one hour.'),
        transaction_id: z.string().optional().describe('Identifier of the transaction this receipt is linked to, when linked to a card transaction.'),
        reimbursement_id: z.string().optional().describe('Identifier of the reimbursement this receipt is linked to, when linked to a reimbursement.'),
        user_id: z.string().optional().describe('Identifier of the user who uploaded the receipt.'),
        ocr: OcrSchema.nullable()
            .optional()
            .describe(
                'Structured OCR data extracted from the receipt image; only populated when include_ocr_data is true, and null when the provider has no OCR data for the receipt.'
            )
    })
    .describe('A single receipt with its metadata, pre-signed download URL, and optional OCR data.');

/**
 * @tags: [read]
 * @tagReason: Reads a single receipt's metadata and signed download URL from the provider without modifying any provider state.
 * @pitfalls: receipt_url is a pre-signed download URL that expires (about one hour), so fetch it promptly; ocr is only populated when include_ocr_data is true and is null when the provider has no OCR data; a receipt is linked to either a transaction_id or a reimbursement_id, so one of those fields is absent.
 */
const action = createAction({
    description: 'Retrieve a single receipt by ID, including its metadata and pre-signed download URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['receipts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/receipts/{receipt_id})
            endpoint: `/developer/v1/receipts/${encodeURIComponent(input.receipt_id)}`,
            params: {
                ...(input.include_ocr_data !== undefined && { include_ocr_data: String(input.include_ocr_data) })
            },
            retries: 3
        };

        const response = await nango.get<unknown>(config);
        const receipt = ProviderReceiptSchema.parse(response.data);

        return {
            id: receipt.id,
            ...(receipt.created_at !== undefined && { created_at: receipt.created_at }),
            receipt_url: receipt.receipt_url,
            ...(receipt.transaction_id !== undefined && { transaction_id: receipt.transaction_id }),
            ...(receipt.reimbursement_id !== undefined && { reimbursement_id: receipt.reimbursement_id }),
            ...(receipt.user_id !== undefined && { user_id: receipt.user_id }),
            ...(receipt.ocr !== undefined && { ocr: receipt.ocr })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
