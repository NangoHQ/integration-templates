import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Monetary amount in the smallest denomination of the currency, e.g. cents when currency_code is USD. Example: 517735'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().describe('Divisor used to convert amount to the real currency value, e.g. 100 for USD.')
});

const FundSuspensionSchema = z.object({
    suspended_at: z.string().nullable().describe('ISO 8601 timestamp at which the suspension was placed, or null when not suspended.'),
    suspended_by_ramp: z.boolean().describe('Whether the suspension was placed by Ramp.'),
    suspended_by_user_id: z.string().nullable().describe('ID of the user who placed the suspension, or null when placed by Ramp.')
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
    suspension: FundSuspensionSchema.nullable().describe('Suspension details for this member, or null when the member is not suspended.')
});

const FundPermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether physical cards can be linked to this fund.'),
    virtual_card_enabled: z.boolean().describe('Whether virtual cards can be linked to this fund.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against this fund.')
});

const FundSpendingRestrictionsSchema = z.object({
    interval: z
        .enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY'])
        .optional()
        .describe('Interval over which the spend limit applies. Example: "MONTHLY"'),
    limit: CurrencyAmountSchema.nullable().describe('Total amount allowed per interval, or null when no limit is set.'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary limit total per interval, or null when none is set.'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null when none is set.'),
    allowed_category_codes: z.array(z.number()).nullable().describe('Ramp category codes allowed on this fund, or null when unrestricted.'),
    blocked_category_codes: z.array(z.number()).nullable().describe('Ramp category codes blocked on this fund, or null when none are blocked.'),
    allowed_vendor_ids: z.array(z.string()).nullable().describe('Vendor IDs allowed on this fund, or null when unrestricted.'),
    blocked_vendor_ids: z.array(z.string()).nullable().describe('Vendor IDs blocked on this fund, or null when none are blocked.'),
    auto_lock_date: z.string().nullable().describe('ISO 8601 date at which the fund is automatically locked, or null when no auto-lock is set.'),
    start_of_interval: z.string().nullable().describe('ISO 8601 date and time at which the current interval started, or null.'),
    next_interval_resets_at: z.string().nullable().describe('ISO 8601 date and time at which the current interval resets, or null.')
});

const FundSchema = z.object({
    id: z.string().describe('Unique identifier of the fund.'),
    display_name: z.string().describe('Display name of the fund. Example: "Executive Travel"'),
    created_at: z.string().describe('ISO 8601 timestamp at which the fund was created.'),
    state: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED', 'TERMINATED']).describe('Current state of the fund.'),
    entity_id: z.string().nullable().describe('Associated business entity ID, or null when not tied to a specific entity.'),
    spend_program_id: z.string().nullable().describe('Associated spend program ID, or null when the fund is not part of a spend program.'),
    is_exempt_from_policy_agent: z.boolean().describe('Whether this fund is exempt from policy agent review.'),
    is_shareable: z.boolean().describe('Whether this fund is shareable among multiple users.'),
    overrides_spend_program: z.boolean().describe('Whether the fund settings override those of its spend program.'),
    balance: FundBalanceSchema.nullable().describe('Current balance of the fund, or null when balance data is unavailable.'),
    permitted_spend_types: FundPermittedSpendTypesSchema.describe('Spend types permitted on this fund.'),
    spending_restrictions: FundSpendingRestrictionsSchema.nullable().describe('Spending restrictions on this fund, or null when none apply.'),
    suspension: FundSuspensionSchema.nullable().describe('Suspension details at the fund level, or null when the fund is not suspended.'),
    members: z.array(FundMemberSchema).describe('Users who can spend from the fund.'),
    cards: z.array(FundCardSchema).describe('Cards linked to this fund.')
});

const InputSchema = z
    .object({
        fund_id: z.string().describe('Unique identifier of the fund to retrieve. Example: "325a12bc-75c4-4022-8855-8e0dba170103"')
    })
    .describe('Input for retrieving a single Ramp fund by ID.');

const OutputSchema = FundSchema.describe('A Ramp fund, including its balance, spending restrictions, members, and linked cards.');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response = error.response;
    return typeof response === 'object' && response !== null && 'status' in response && response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single fund by ID; read-only with no provider mutation.
 * @pitfalls: A terminated or archived fund still returns a successful response with a non-ACTIVE `state`, so callers must inspect `state` rather than assume the fund is usable; an unknown fund ID fails with a `not_found` ActionError instead of an empty result.
 */
const action = createAction({
    description: 'Retrieve a single fund by ID.',
    version: '1.0.0',
    scopes: ['funds:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - convert a provider 404 into a clear, typed not-found error instead of a raw HTTP failure.
        try {
            const response = await nango.get({
                // https://docs.ramp.com/developer-api/v1/api-reference/funds/get-fund
                endpoint: `/developer/v1/funds/${encodeURIComponent(input.fund_id)}`,
                retries: 3
            });

            return OutputSchema.parse(response.data);
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Fund ${input.fund_id} was not found.`
                });
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
