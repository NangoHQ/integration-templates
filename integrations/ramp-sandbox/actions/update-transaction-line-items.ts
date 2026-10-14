import { z } from 'zod';
import { createAction } from 'nango';

const AccountingFieldSelectionInputSchema = z.object({
    field_id: z.string().optional().describe('Ramp UUID of the accounting field. Provide exactly one of field_id or field_external_id.'),
    field_external_id: z.string().optional().describe('ERP remote ID of the accounting field. Provide exactly one of field_id or field_external_id.'),
    field_option_id: z
        .string()
        .optional()
        .describe('Ramp UUID of the accounting field option. Provide exactly one of field_option_id, field_option_external_id, or free_form_text.'),
    field_option_external_id: z
        .string()
        .optional()
        .describe('ERP remote ID of the accounting field option. Provide exactly one of field_option_id, field_option_external_id, or free_form_text.'),
    free_form_text: z
        .string()
        .optional()
        .describe(
            'Free-form value for the accounting field (ISO date YYYY-MM-DD for date fields). Provide exactly one of field_option_id, field_option_external_id, or free_form_text.'
        )
});

const LineItemInputSchema = z.object({
    amount: z
        .number()
        .int()
        .describe(
            'Line item amount in minor units (e.g. 5000 = $50.00) in the transaction original currency. Line item amounts must sum to the transaction total.'
        ),
    memo: z.string().nullable().optional().describe('Optional memo for this line item, for example a case ID.'),
    accounting_field_selections: z.array(AccountingFieldSelectionInputSchema).optional().describe('Accounting field options used to code this line item.')
});

const InputSchema = z
    .object({
        transaction_id: z
            .string()
            .describe('Unique identifier of the transaction whose split to set or replace. Example: "1e132a4f-392b-4e12-8f35-2788034a9ead".'),
        line_items: z
            .array(LineItemInputSchema)
            .describe('Replacement line items for the transaction split. Amounts must sum to the transaction total. Send an empty array to remove the split.')
    })
    .describe('Input for setting, replacing, or removing the line-item split of a transaction.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in minor units (e.g. 5000 = $50.00).'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount.'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor used to convert minor units to the major unit (100 for USD).')
});

const SignedAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code of the amount.'),
    value: z.number().describe('Amount in minor units; may be negative for refunds or credits.')
});

const AccountingFieldSelectionOutputSchema = z.object({
    id: z.string().optional().describe('Ramp ID of the accounting field option.'),
    name: z.string().optional().describe('Name of the accounting field option.'),
    external_id: z.string().optional().describe('ERP external ID of the accounting field option.'),
    external_code: z.string().optional().describe('ERP code of the accounting field option.'),
    display_name: z.string().nullable().optional().describe('Customer-set display name for the option when overridden in Ramp.'),
    type: z.string().optional().describe('Accounting field type, for example GL_ACCOUNT or SUBSIDIARY.'),
    provider_name: z.string().optional().describe('Name of the accounting provider that supplies the field.')
});

const LineItemOutputSchema = z.object({
    id: z.string().nullable().optional().describe('Stable identifier of the persisted line item; null for generated lines.'),
    amount: CurrencyAmountSchema.nullable().optional().describe('Line item amount in the transaction original currency.'),
    converted_amount: CurrencyAmountSchema.nullable().optional().describe('Line item amount converted to the currency of the card.'),
    memo: z.string().nullable().optional().describe('Memo associated with the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionOutputSchema).optional().describe('Accounting field options coded to this line item.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated transaction.'),
        line_items: z.array(LineItemOutputSchema).describe('Line items of the transaction after the update.'),
        entity_amount: SignedAmountSchema.nullable().describe(
            'Transaction total settled to the entity, in minor units; null when no settlement currency is recorded.'
        ),
        memo: z.string().nullable().describe('Transaction-level memo, if any.'),
        state: z.string().describe('Transaction state, for example CLEARED or PENDING.'),
        updated_at: z.string().nullable().describe('Timestamp of the last transaction update, in ISO 8601 format.'),
        sync_status: z.string().optional().describe('Accounting sync readiness of the transaction.')
    })
    .describe('The transaction after its line-item split was set, replaced, or removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the transaction's existing line-item split, overwriting prior accounting coding; sending an empty array clears the split.
 * @pitfalls: Line-item amounts are in the transaction's original (merchant) currency and must sum to that original total, not the entity/settlement amount; the business must have a connected accounting provider or the request is rejected; sending an empty array removes the split.
 */
const action = createAction({
    description: 'Set or replace the accounting line-item split (amount, memo, and accounting field selections) on a transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.ramp.com/openapi/developer-api.json - PATCH /developer/v1/transactions/{transaction_id}
            endpoint: `/developer/v1/transactions/${encodeURIComponent(input.transaction_id)}`,
            data: {
                line_items: input.line_items.map((lineItem) => ({
                    amount: lineItem.amount,
                    ...(lineItem.memo !== undefined && { memo: lineItem.memo }),
                    ...(lineItem.accounting_field_selections !== undefined && { accounting_field_selections: lineItem.accounting_field_selections })
                }))
            },
            // The split is replaced wholesale, so re-sending the same body is idempotent; the standard retry ceiling is safe.
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
