import { z } from 'zod';
import { createAction } from 'nango';

import { FundSchema, IntervalSchema, ProviderFundSchema, mapFund } from '../helpers/funds.js';

const CurrencyAmountInputSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 500000 for $5,000.00.'),
    currency_code: z.string().optional().describe('ISO 4217 currency code. Defaults to "USD" when omitted.')
});

const PermittedSpendTypesInputSchema = z.object({
    physical_card: z.boolean().describe('Whether the fund permits linking a physical card.'),
    reimbursements: z.boolean().describe('Whether reimbursements can be submitted against the fund.'),
    virtual_card: z.boolean().describe('Whether the fund permits linking virtual cards.')
});

const SpendingRestrictionsInputSchema = z.object({
    allowed_category_codes: z.array(z.number().int()).optional().describe('Allowlist of Ramp category codes; an empty list clears the allowlist.'),
    allowed_vendor_ids: z.array(z.string()).optional().describe('Allowlist of vendor IDs; an empty list clears the allowlist.'),
    blocked_category_codes: z.array(z.number().int()).optional().describe('Blocklist of Ramp category codes.'),
    blocked_mcc_codes: z.array(z.string()).optional().describe('Blocklist of merchant category codes (MCC).'),
    blocked_vendor_ids: z.array(z.string()).optional().describe('Blocklist of vendor IDs.'),
    convert_to_entity_currency: z.boolean().optional().describe('Convert the limit to the fund entity currency at Ramp daily rates.'),
    interval: IntervalSchema.optional().describe('Interval the spend limit resets on.'),
    is_temporary_increase: z.boolean().optional().describe('Whether this limit change is a temporary increase.'),
    limit: CurrencyAmountInputSchema.optional().describe('Total spend limit per interval.'),
    lock_date: z.string().nullable().optional().describe('ISO-8601 date/time to automatically suspend the fund; pass null to unsuspend.'),
    transaction_amount_limit: CurrencyAmountInputSchema.optional().describe('Maximum amount allowed on a single transaction.')
});

const AccountingRuleInputSchema = z.object({
    field_id: z.string().describe('UUID of the accounting field.'),
    field_option_id: z.string().describe('UUID of the accounting field option.')
});

const InputSchema = z
    .object({
        fund_id: z.string().describe('Unique identifier of the fund to update. Example: "ac939b91-5ecc-48ed-b571-ab312f6e4f5d".'),
        display_name: z.string().optional().describe('New display name for the fund.'),
        permitted_spend_types: PermittedSpendTypesInputSchema.optional().describe(
            'Full replacement of the fund permitted spend types; all three fields are required when provided.'
        ),
        spending_restrictions: SpendingRestrictionsInputSchema.optional().describe(
            'Partial spending restriction overrides that merge with the fund existing values.'
        ),
        accounting_rules: z.array(AccountingRuleInputSchema).optional().describe('Full replacement of the fund accounting rules.')
    })
    .describe('Parameters for updating a Ramp fund.');

const OutputSchema = FundSchema.describe('The updated Ramp fund.');

/**
 * @tags: [write]
 * @tagReason: Sends a PATCH request that mutates the fund's display name, permitted spend types, spending restrictions, or accounting rules.
 * @pitfalls: spending_restrictions partially merges with existing values, but permitted_spend_types and accounting_rules replace the whole set so omitted entries are reset; the output names permitted spend types physical_card_enabled/virtual_card_enabled/reimbursements_enabled, and accounting rules are never echoed back.
 */
const action = createAction({
    description: 'Update a fund.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['funds:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.ramp.com/api-reference/funds/update-a-fund
            endpoint: `/developer/v1/funds/${encodeURIComponent(input.fund_id)}`,
            data: {
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.permitted_spend_types !== undefined && {
                    permitted_spend_types: {
                        physical_card: input.permitted_spend_types.physical_card,
                        reimbursements: input.permitted_spend_types.reimbursements,
                        virtual_card: input.permitted_spend_types.virtual_card
                    }
                }),
                ...(input.spending_restrictions !== undefined && { spending_restrictions: input.spending_restrictions }),
                ...(input.accounting_rules !== undefined && { accounting_rules: input.accounting_rules })
            },
            // PATCH sets absolute values, so retrying after a lost response is safe.
            retries: 3
        });

        return mapFund(ProviderFundSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
