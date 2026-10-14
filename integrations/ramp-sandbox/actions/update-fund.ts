import { z } from 'zod';
import { createAction } from 'nango';

const IntervalSchema = z.enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY']);

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

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".'),
    minor_unit_conversion_rate: z.number().int().nullable().describe('Factor converting minor units to the real amount (100 for USD), or null.')
});

const FundPermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether physical cards can be linked to the fund.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against the fund.'),
    virtual_card_enabled: z.boolean().describe('Whether virtual cards can be linked to the fund.')
});

const FundBalanceSchema = z.object({
    cleared: CurrencyAmountSchema.describe('Cleared amount on the fund.'),
    pending: CurrencyAmountSchema.describe('Pending amount towards the fund.'),
    total: CurrencyAmountSchema.describe('Total amount spent on the fund.')
});

const FundSuspensionSchema = z.object({
    suspended_at: z.string().nullable().describe('Date/time the suspension was placed, or null.'),
    suspended_by_ramp: z.boolean().describe('Whether the suspension was placed by Ramp.'),
    suspended_by_user_id: z.string().nullable().describe('ID of the user who placed the suspension, or null.')
});

const FundSpendingRestrictionsSchema = z.object({
    allowed_category_codes: z.array(z.number().int()).nullable().describe('Allowed Ramp category codes, or null if unrestricted.'),
    allowed_vendor_ids: z.array(z.string()).nullable().describe('Allowed vendor IDs, or null if unrestricted.'),
    auto_lock_date: z.string().nullable().describe('Date/time the fund automatically locks, or null.'),
    blocked_category_codes: z.array(z.number().int()).nullable().describe('Blocked Ramp category codes, or null if unrestricted.'),
    blocked_vendor_ids: z.array(z.string()).nullable().describe('Blocked vendor IDs, or null if unrestricted.'),
    interval: IntervalSchema.optional().describe('Interval the spend limit resets on.'),
    limit: CurrencyAmountSchema.nullable().describe('Total spend limit per interval, or null.'),
    next_interval_resets_at: z.string().nullable().describe('Date/time the current interval resets, or null.'),
    start_of_interval: z.string().nullable().describe('Date/time the current interval started, or null.'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary spend limit per interval, or null.'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null.')
});

const FundCardSchema = z.object({
    card_id: z.string().describe('Unique identifier of the card.'),
    created_at: z.string().describe('Date/time the card was created.'),
    display_name: z.string().describe('Display name of the card.'),
    expiration: z.string().describe('Expiration date in MMYY format; redacted if the card is not activated.'),
    last_four: z.string().describe('Last four digits of the card number; redacted if the card is not activated.'),
    user_id: z.string().describe('Unique identifier of the cardholder.')
});

const FundMemberSchema = z.object({
    user_id: z.string().describe('Unique identifier of the fund member.'),
    suspension: FundSuspensionSchema.nullable().describe('Suspension details for this member, or null if not suspended.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the fund.'),
        display_name: z.string().describe('Display name of the fund.'),
        state: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED', 'TERMINATED']).describe('Current state of the fund.'),
        entity_id: z.string().nullable().describe('ID of the entity the fund belongs to, or null.'),
        created_at: z.string().describe('Date/time the fund was created.'),
        is_exempt_from_policy_agent: z.boolean().describe('Whether the fund is exempt from policy agent review.'),
        is_shareable: z.boolean().describe('Whether the fund supports multiple members.'),
        overrides_spend_program: z.boolean().describe('Whether the fund overrides its linked spend program defaults.'),
        spend_program_id: z.string().nullable().describe('ID of the associated spend program, or null.'),
        permitted_spend_types: FundPermittedSpendTypesSchema.describe('Spend types permitted on the fund.'),
        spending_restrictions: FundSpendingRestrictionsSchema.nullable().describe('Spending restrictions applied to the fund, or null.'),
        balance: FundBalanceSchema.nullable().describe('Current balance of the fund, or null.'),
        suspension: FundSuspensionSchema.nullable().describe('Suspension details for the fund, or null if not suspended.'),
        cards: z.array(FundCardSchema).describe('Cards linked to the fund.'),
        members: z.array(FundMemberSchema).describe('Members who can spend from the fund.')
    })
    .describe('The updated Ramp fund.');

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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
