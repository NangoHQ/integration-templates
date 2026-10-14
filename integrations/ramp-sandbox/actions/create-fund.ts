import { z } from 'zod';
import { createAction } from 'nango';

const IntervalSchema = z.enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY']);

const CurrencyAmountInputSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 10000 for $100.00.'),
    currency_code: z.string().optional().describe('ISO 4217 currency code. Defaults to USD. Example: "USD".')
});

const SpendingRestrictionsInputSchema = z.object({
    limit: CurrencyAmountInputSchema.describe('Total spend limit applied per interval.'),
    interval: IntervalSchema.describe('Interval the limit resets on. Example: "MONTHLY".'),
    transaction_amount_limit: CurrencyAmountInputSchema.optional().describe('Maximum amount allowed on a single transaction.')
});

const PermittedSpendTypesInputSchema = z.object({
    physical_card: z.boolean().describe('Whether the owner can link a physical card to this fund.'),
    virtual_card: z.boolean().describe('Whether virtual cards can be linked to this fund. Setting true auto-issues a virtual card.'),
    reimbursements: z.boolean().describe('Whether reimbursements can be submitted against this fund.')
});

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the fund owner. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731".'),
        display_name: z.string().describe('Display name of the fund. Example: "T&E".'),
        spending_restrictions: SpendingRestrictionsInputSchema.describe('Spend limits and interval for the fund.'),
        permitted_spend_types: PermittedSpendTypesInputSchema.describe('Which spend types the fund allows.')
    })
    .describe('Input for creating a new fund (spend limit).');

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

const OutputSchema = FundSchema.describe('The newly created fund.');

/**
 * @tags: [write]
 * @tagReason: Creates a new fund (spend limit) at the provider.
 * @pitfalls: Creates a standalone fund (not linked to a spend program), so Ramp requires display_name, spending_restrictions (limit and interval), and permitted_spend_types and rejects the request with a 422 if any is missing; enabling virtual_card or physical_card auto-issues a card as a side effect. A fund cannot be deleted, only terminated, and virtual cards have no direct create/suspend/terminate operation, so the auto-issued card is wound down by terminating the fund.
 */
const action = createAction({
    description: 'Create a new fund (spend limit) for a user, optionally auto-issuing a card against it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['funds:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const spendingRestrictions = input.spending_restrictions;
        const permittedSpendTypes = input.permitted_spend_types;

        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/api-reference/fund/post-fund-creation
            endpoint: '/developer/v1/funds',
            data: {
                user_id: input.user_id,
                display_name: input.display_name,
                spending_restrictions: {
                    limit: {
                        amount: spendingRestrictions.limit.amount,
                        ...(spendingRestrictions.limit.currency_code !== undefined && {
                            currency_code: spendingRestrictions.limit.currency_code
                        })
                    },
                    interval: spendingRestrictions.interval,
                    ...(spendingRestrictions.transaction_amount_limit !== undefined && {
                        transaction_amount_limit: {
                            amount: spendingRestrictions.transaction_amount_limit.amount,
                            ...(spendingRestrictions.transaction_amount_limit.currency_code !== undefined && {
                                currency_code: spendingRestrictions.transaction_amount_limit.currency_code
                            })
                        }
                    })
                },
                permitted_spend_types: {
                    physical_card: permittedSpendTypes.physical_card,
                    virtual_card: permittedSpendTypes.virtual_card,
                    reimbursements: permittedSpendTypes.reimbursements
                }
            },
            // Not idempotent: a retry after a lost response would create a duplicate fund.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return mapFund(ProviderFundSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
