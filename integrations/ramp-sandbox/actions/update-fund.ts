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

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number().int(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().int().nullable()
});

const ProviderFundSuspensionSchema = z.object({
    suspended_at: z.string().nullable(),
    suspended_by_ramp: z.boolean(),
    suspended_by_user_id: z.string().nullable()
});

const ProviderFundSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    created_at: z.string(),
    state: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED', 'TERMINATED']),
    entity_id: z.string().nullable(),
    spend_program_id: z.string().nullable(),
    is_exempt_from_policy_agent: z.boolean(),
    is_shareable: z.boolean(),
    overrides_spend_program: z.boolean(),
    balance: z
        .object({
            cleared: ProviderCurrencyAmountSchema,
            pending: ProviderCurrencyAmountSchema,
            total: ProviderCurrencyAmountSchema
        })
        .nullable(),
    permitted_spend_types: z.object({
        physical_card_enabled: z.boolean(),
        virtual_card_enabled: z.boolean(),
        reimbursements_enabled: z.boolean()
    }),
    spending_restrictions: z
        .object({
            interval: IntervalSchema.optional(),
            limit: ProviderCurrencyAmountSchema.nullable(),
            temporary_limit: ProviderCurrencyAmountSchema.nullable(),
            transaction_amount_limit: ProviderCurrencyAmountSchema.nullable(),
            allowed_category_codes: z.array(z.number().int()).nullable(),
            blocked_category_codes: z.array(z.number().int()).nullable(),
            allowed_vendor_ids: z.array(z.string()).nullable(),
            blocked_vendor_ids: z.array(z.string()).nullable(),
            auto_lock_date: z.string().nullable(),
            start_of_interval: z.string().nullable(),
            next_interval_resets_at: z.string().nullable()
        })
        .nullable(),
    suspension: ProviderFundSuspensionSchema.nullable(),
    members: z.array(
        z.object({
            user_id: z.string(),
            suspension: ProviderFundSuspensionSchema.nullable()
        })
    ),
    cards: z.array(
        z.object({
            card_id: z.string(),
            display_name: z.string(),
            created_at: z.string(),
            expiration: z.string(),
            last_four: z.string(),
            user_id: z.string()
        })
    )
});

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest denomination of the currency, e.g. cents when currency_code is USD. Example: 517735'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .int()
        .optional()
        .describe('Divisor used to convert amount to the real currency value, e.g. 100 for USD. Omitted when Ramp does not provide one.')
});

const FundSuspensionSchema = z.object({
    suspended_by_ramp: z.boolean().describe('Whether the suspension was placed by Ramp.'),
    suspended_at: z.string().optional().describe('ISO 8601 timestamp at which the suspension was placed. Omitted when not recorded.'),
    suspended_by_user_id: z.string().optional().describe('ID of the user who placed the suspension. Omitted when placed by Ramp.')
});

const FundBalanceSchema = z.object({
    cleared: CurrencyAmountSchema.describe('Cleared amount on this fund.'),
    pending: CurrencyAmountSchema.describe('Pending amount towards this fund.'),
    total: CurrencyAmountSchema.describe('Total amount on this fund.')
});

const FundCardSchema = z.object({
    card_id: z.string().describe('Unique identifier of the card.'),
    display_name: z.string().describe('Display name of the card.'),
    created_at: z.string().describe('ISO 8601 timestamp at which the card was created.'),
    expiration: z.string().describe('Card expiration in MMYY format, or "*REDACTED*" once the card is not activated, suspended, or terminated.'),
    last_four: z.string().describe('Last four digits of the card number, or "*REDACTED*" once the card is not activated, suspended, or terminated.'),
    user_id: z.string().describe('Unique identifier of the cardholder.')
});

const FundMemberSchema = z.object({
    user_id: z.string().describe('Unique identifier of the fund member.'),
    suspension: FundSuspensionSchema.optional().describe('Suspension details for this member. Omitted when the member is not suspended.')
});

const FundPermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether physical cards can be linked to this fund.'),
    virtual_card_enabled: z.boolean().describe('Whether virtual cards can be linked to this fund.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against this fund.')
});

const FundSpendingRestrictionsSchema = z.object({
    interval: IntervalSchema.optional().describe('Interval over which the spend limit applies. Example: "MONTHLY"'),
    limit: CurrencyAmountSchema.optional().describe('Total amount allowed per interval. Omitted when no limit is set.'),
    temporary_limit: CurrencyAmountSchema.optional().describe('Temporary limit total per interval. Omitted when none is set.'),
    transaction_amount_limit: CurrencyAmountSchema.optional().describe('Maximum amount allowed on a single transaction. Omitted when none is set.'),
    allowed_category_codes: z.array(z.number().int()).optional().describe('Ramp category codes allowed on this fund. Omitted when unrestricted.'),
    blocked_category_codes: z.array(z.number().int()).optional().describe('Ramp category codes blocked on this fund. Omitted when none are blocked.'),
    allowed_vendor_ids: z.array(z.string()).optional().describe('Vendor IDs allowed on this fund. Omitted when unrestricted.'),
    blocked_vendor_ids: z.array(z.string()).optional().describe('Vendor IDs blocked on this fund. Omitted when none are blocked.'),
    auto_lock_date: z.string().optional().describe('ISO 8601 date at which the fund is automatically locked. Omitted when no auto-lock is set.'),
    start_of_interval: z.string().optional().describe('ISO 8601 date and time at which the current interval started. Omitted when not applicable.'),
    next_interval_resets_at: z.string().optional().describe('ISO 8601 date and time at which the current interval resets. Omitted when not applicable.')
});

const FundSchema = z.object({
    id: z.string().describe('Unique identifier of the fund.'),
    display_name: z.string().describe('Display name of the fund. Example: "Executive Travel"'),
    created_at: z.string().describe('ISO 8601 timestamp at which the fund was created.'),
    state: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED', 'TERMINATED']).describe('Current state of the fund.'),
    entity_id: z.string().optional().describe('Associated business entity ID. Omitted when the fund is not tied to a specific entity.'),
    spend_program_id: z.string().optional().describe('Associated spend program ID. Omitted when the fund is not part of a spend program.'),
    is_exempt_from_policy_agent: z.boolean().describe('Whether this fund is exempt from policy agent review.'),
    is_shareable: z.boolean().describe('Whether this fund is shareable among multiple users.'),
    overrides_spend_program: z.boolean().describe('Whether the fund settings override those of its spend program.'),
    balance: FundBalanceSchema.optional().describe('Current balance of the fund. Omitted when balance data is unavailable.'),
    permitted_spend_types: FundPermittedSpendTypesSchema.describe('Spend types permitted on this fund.'),
    spending_restrictions: FundSpendingRestrictionsSchema.optional().describe('Spending restrictions on this fund. Omitted when none apply.'),
    suspension: FundSuspensionSchema.optional().describe('Suspension details at the fund level. Omitted when the fund is not suspended.'),
    members: z.array(FundMemberSchema).describe('Users who can spend from the fund.'),
    cards: z.array(FundCardSchema).describe('Cards linked to this fund.')
});

function mapCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapSuspension(suspension: z.infer<typeof ProviderFundSuspensionSchema>): z.infer<typeof FundSuspensionSchema> {
    return {
        suspended_by_ramp: suspension.suspended_by_ramp,
        ...(suspension.suspended_at != null && { suspended_at: suspension.suspended_at }),
        ...(suspension.suspended_by_user_id != null && { suspended_by_user_id: suspension.suspended_by_user_id })
    };
}

function mapFund(fund: z.infer<typeof ProviderFundSchema>): z.infer<typeof FundSchema> {
    const restrictions = fund.spending_restrictions;

    return {
        id: fund.id,
        display_name: fund.display_name,
        created_at: fund.created_at,
        state: fund.state,
        ...(fund.entity_id != null && { entity_id: fund.entity_id }),
        ...(fund.spend_program_id != null && { spend_program_id: fund.spend_program_id }),
        is_exempt_from_policy_agent: fund.is_exempt_from_policy_agent,
        is_shareable: fund.is_shareable,
        overrides_spend_program: fund.overrides_spend_program,
        ...(fund.balance != null && {
            balance: {
                cleared: mapCurrencyAmount(fund.balance.cleared),
                pending: mapCurrencyAmount(fund.balance.pending),
                total: mapCurrencyAmount(fund.balance.total)
            }
        }),
        permitted_spend_types: fund.permitted_spend_types,
        ...(restrictions != null && {
            spending_restrictions: {
                ...(restrictions.interval != null && { interval: restrictions.interval }),
                ...(restrictions.limit != null && { limit: mapCurrencyAmount(restrictions.limit) }),
                ...(restrictions.temporary_limit != null && { temporary_limit: mapCurrencyAmount(restrictions.temporary_limit) }),
                ...(restrictions.transaction_amount_limit != null && { transaction_amount_limit: mapCurrencyAmount(restrictions.transaction_amount_limit) }),
                ...(restrictions.allowed_category_codes != null && { allowed_category_codes: restrictions.allowed_category_codes }),
                ...(restrictions.blocked_category_codes != null && { blocked_category_codes: restrictions.blocked_category_codes }),
                ...(restrictions.allowed_vendor_ids != null && { allowed_vendor_ids: restrictions.allowed_vendor_ids }),
                ...(restrictions.blocked_vendor_ids != null && { blocked_vendor_ids: restrictions.blocked_vendor_ids }),
                ...(restrictions.auto_lock_date != null && { auto_lock_date: restrictions.auto_lock_date }),
                ...(restrictions.start_of_interval != null && { start_of_interval: restrictions.start_of_interval }),
                ...(restrictions.next_interval_resets_at != null && { next_interval_resets_at: restrictions.next_interval_resets_at })
            }
        }),
        ...(fund.suspension != null && { suspension: mapSuspension(fund.suspension) }),
        members: fund.members.map((member) => ({
            user_id: member.user_id,
            ...(member.suspension != null && { suspension: mapSuspension(member.suspension) })
        })),
        cards: fund.cards
    };
}

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
