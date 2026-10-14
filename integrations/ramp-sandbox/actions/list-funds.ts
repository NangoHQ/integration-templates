import { z } from 'zod';
import { createAction } from 'nango';

const IntervalSchema = z.enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY']);

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

const InputSchema = z
    .object({
        cursor: z
            .string()
            .url()
            .optional()
            .describe('Opaque cursor returned as next_cursor by a previous call. When provided, all other filters are ignored and the cursor page is fetched.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of funds to return per page, between 2 and 100. Defaults to 20.'),
        display_name: z.string().optional().describe('Filter by fund display name'),
        entity_id: z.string().optional().describe('Filter by associated business entity ID'),
        is_terminated: z
            .boolean()
            .optional()
            .describe('When true, return only terminated funds; when false, exclude terminated funds. Omit to include funds in every state.')
    })
    .describe('Filters and pagination options for listing Ramp funds (spend limits).');

const OutputSchema = z
    .object({
        items: z.array(FundSchema).describe('Funds returned for this page'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as input.cursor to fetch the next page; omitted when there are no more results')
    })
    .describe('A page of Ramp funds (spend limits) plus an optional cursor for the next page.');

const ProviderResponseSchema = z.object({
    data: z.array(ProviderFundSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of funds from Ramp; no provider state is modified.
 * @pitfalls: Amounts are integers in the smallest currency unit (cents for USD); divide by minor_unit_conversion_rate for the real value. Terminated funds are returned by default unless is_terminated is set. Card last_four and expiration are redacted to "*REDACTED*" for inactive cards. Passing a cursor ignores any other filters, so re-supply filters only when starting a new query.
 */
const action = createAction({
    description:
        'List funds - Ramp\'s current API name for what the product UI still calls "spend limits" - each a card-attached spending limit with its own balance and restrictions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['funds:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};

        if (input.cursor !== undefined) {
            const cursorUrl = new URL(input.cursor);
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            if (input.page_size !== undefined) {
                params['page_size'] = input.page_size;
            }
            if (input.display_name !== undefined) {
                params['display_name'] = input.display_name;
            }
            if (input.entity_id !== undefined) {
                params['entity_id'] = input.entity_id;
            }
            if (input.is_terminated !== undefined) {
                params['is_terminated'] = String(input.is_terminated);
            }
        }

        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/funds/get-fund-list (Ramp Developer API - List funds)
            endpoint: '/developer/v1/funds',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.data.map(mapFund),
            ...(parsed.page.next != null && { next_cursor: parsed.page.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
