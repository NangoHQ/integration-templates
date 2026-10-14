import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountInputSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 10000 for $100.00.'),
    currency_code: z.string().optional().describe('ISO 4217 currency code. Defaults to USD. Example: "USD".')
});

const SpendingRestrictionsInputSchema = z.object({
    limit: CurrencyAmountInputSchema.describe('Total spend limit applied per interval.'),
    interval: z
        .enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY'])
        .describe('Interval the limit resets on. Example: "MONTHLY".'),
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
        display_name: z.string().optional().describe('Display name of the fund. Example: "T&E".'),
        spending_restrictions: SpendingRestrictionsInputSchema.optional().describe('Spend limits and interval for the fund.'),
        permitted_spend_types: PermittedSpendTypesInputSchema.optional().describe('Which spend types the fund allows.')
    })
    .describe('Input for creating a new fund (spend limit).');

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".'),
    minor_unit_conversion_rate: z.number().int().nullable().describe('Divisor converting the minor-unit amount to the currency value, or null. Example: 100.')
});

const FundBalanceSchema = z.object({
    cleared: CurrencyAmountSchema.describe('Cleared amount on the fund.'),
    pending: CurrencyAmountSchema.describe('Pending amount towards the fund.'),
    total: CurrencyAmountSchema.describe('Total amount spent on the fund.')
});

const FundCardSchema = z.object({
    card_id: z.string().describe('Unique identifier of the card.'),
    created_at: z.string().describe('Time the card was created, in ISO 8601 format.'),
    display_name: z.string().describe('Display name of the card.'),
    expiration: z.string().describe('Expiration date in MMYY format, or "*REDACTED*" if the card is not activated.'),
    last_four: z.string().describe('Last four digits of the card number, or "*REDACTED*" if the card is not activated.'),
    user_id: z.string().describe('Unique identifier of the cardholder.')
});

const FundSuspensionSchema = z.object({
    suspended_at: z.string().nullable().describe('Date and time the suspension was placed, or null.'),
    suspended_by_ramp: z.boolean().describe('Whether the suspension was placed by Ramp.'),
    suspended_by_user_id: z.string().nullable().describe('Identifier of the user who placed the suspension, or null.')
});

const FundMemberSchema = z.object({
    user_id: z.string().describe('Unique identifier of the fund member.'),
    suspension: FundSuspensionSchema.nullable().describe('Suspension details for this member, or null if not suspended.')
});

const FundPermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether a physical card can be linked to this fund.'),
    virtual_card_enabled: z.boolean().describe('Whether virtual cards can be linked to this fund.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against this fund.')
});

const FundSpendingRestrictionsSchema = z.object({
    allowed_category_codes: z.array(z.number().int()).nullable().describe('Allowed Ramp category codes, or null if unrestricted.'),
    allowed_vendor_ids: z.array(z.string()).nullable().describe('Allowed vendor IDs, or null if unrestricted.'),
    auto_lock_date: z.string().nullable().describe('Date the fund automatically locks, or null.'),
    blocked_category_codes: z.array(z.number().int()).nullable().describe('Blocked Ramp category codes, or null if unrestricted.'),
    blocked_vendor_ids: z.array(z.string()).nullable().describe('Blocked vendor IDs, or null if unrestricted.'),
    interval: z.enum(['ANNUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'TERTIARY', 'TOTAL', 'WEEKLY', 'YEARLY']).optional().describe('Interval the limit resets on.'),
    limit: CurrencyAmountSchema.nullable().describe('Total amount limit per interval, or null.'),
    next_interval_resets_at: z.string().nullable().describe('Date and time of the next interval reset, or null.'),
    start_of_interval: z.string().nullable().describe('Date and time of the start of the current interval, or null.'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary limit per interval, or null.'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null.')
});

const OutputSchemaBase = z.object({
    id: z.string().describe('Unique identifier of the created fund.'),
    display_name: z.string().describe('Display name of the fund.'),
    entity_id: z.string().nullable().describe('Associated business entity of the fund, or null.'),
    created_at: z.string().describe('Time the fund was created, in ISO 8601 format.'),
    state: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED', 'TERMINATED']).describe('Current state of the fund.'),
    is_exempt_from_policy_agent: z.boolean().describe('Whether the fund is exempt from policy agent review.'),
    is_shareable: z.boolean().describe('Whether the fund is shareable among multiple users.'),
    overrides_spend_program: z.boolean().describe('Whether the fund settings override those of its spend program.'),
    spend_program_id: z.string().nullable().describe('Identifier of the associated spend program, or null.'),
    permitted_spend_types: FundPermittedSpendTypesSchema.describe('Permitted spend types for the fund.'),
    spending_restrictions: FundSpendingRestrictionsSchema.nullable().describe('Spending restrictions on the fund, or null.'),
    balance: FundBalanceSchema.nullable().describe('Current balance of the fund, or null.'),
    cards: z.array(FundCardSchema).describe('Cards linked to the fund, including any auto-issued card.'),
    members: z.array(FundMemberSchema).describe('Members who can spend from the fund.'),
    suspension: FundSuspensionSchema.nullable().describe('Suspension details at the fund level, or null if not suspended.')
});

const OutputSchema = OutputSchemaBase.describe('The newly created fund.');

/**
 * @tags: [write]
 * @tagReason: Creates a new fund (spend limit) at the provider.
 * @pitfalls: Creates a standalone fund, so display_name, spending_restrictions (limit and interval), and permitted_spend_types must be provided together; enabling virtual_card or physical_card auto-issues a card as a side effect. A fund cannot be deleted, only terminated, and virtual cards have no direct create/suspend/terminate operation, so the auto-issued card is wound down by terminating the fund.
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
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(spendingRestrictions !== undefined && {
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
                    }
                }),
                ...(permittedSpendTypes !== undefined && {
                    permitted_spend_types: {
                        physical_card: permittedSpendTypes.physical_card,
                        virtual_card: permittedSpendTypes.virtual_card,
                        reimbursements: permittedSpendTypes.reimbursements
                    }
                })
            },
            // Not idempotent: a retry after a lost response would create a duplicate fund.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
