import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (cents for USD). Example: 10000 = $100.00'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().int().nullable().describe('Factor used to convert amount into the real currency value. Example: 100 for USD')
});

const FundSuspensionSchema = z.object({
    suspended_at: z.string().nullable().describe('When the suspension was placed, in ISO 8601 format, or null if not recorded'),
    suspended_by_ramp: z.boolean().describe('Whether the suspension was placed by Ramp'),
    suspended_by_user_id: z.string().nullable().describe('ID of the user who placed the suspension, or null if placed by Ramp')
});

const SpendingRestrictionsSchema = z.object({
    limit: CurrencyAmountSchema.nullable().describe('Total spend limit per interval, or null if no limit is set'),
    interval: z.string().optional().describe('Interval the limit applies to. Example: "MONTHLY"'),
    start_of_interval: z.string().nullable().describe('Start of the current interval, in ISO 8601 format, or null'),
    next_interval_resets_at: z.string().nullable().describe('When the current interval resets, in ISO 8601 format, or null'),
    auto_lock_date: z.string().nullable().describe('Date the fund automatically locks, in ISO 8601 format, or null'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary spend limit per interval, or null if none'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null if none'),
    allowed_category_codes: z.array(z.number().int()).nullable().describe('Allowed Ramp category codes, or null if unrestricted'),
    blocked_category_codes: z.array(z.number().int()).nullable().describe('Blocked Ramp category codes, or null if unrestricted'),
    allowed_vendor_ids: z.array(z.string()).nullable().describe('Allowed vendor IDs, or null if unrestricted'),
    blocked_vendor_ids: z.array(z.string()).nullable().describe('Blocked vendor IDs, or null if unrestricted')
});

const FundBalanceSchema = z.object({
    cleared: CurrencyAmountSchema.describe('Cleared amount spent on the fund'),
    pending: CurrencyAmountSchema.describe('Pending amount towards the fund'),
    total: CurrencyAmountSchema.describe('Total amount spent on the fund')
});

const PermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether physical cards can be linked to the fund'),
    virtual_card_enabled: z.boolean().describe('Whether virtual cards can be linked to the fund'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against the fund')
});

const FundCardSchema = z.object({
    card_id: z.string().describe('Unique identifier of the card'),
    display_name: z.string().describe('Display name of the card'),
    last_four: z.string().describe('Last four digits of the card number, or "*REDACTED*" if the card is not active'),
    expiration: z.string().describe('Card expiration in MMYY format, or "*REDACTED*" if the card is not active'),
    user_id: z.string().describe('Unique identifier of the cardholder'),
    created_at: z.string().describe('When the card was created, in ISO 8601 format')
});

const FundMemberSchema = z.object({
    user_id: z.string().describe('Unique identifier of the fund member'),
    suspension: FundSuspensionSchema.nullable().describe('Suspension details for this member, or null if not suspended')
});

const FundSchema = z.object({
    id: z.string().describe('Unique identifier of the fund'),
    display_name: z.string().describe('Display name of the fund'),
    entity_id: z.string().nullable().describe('ID of the associated business entity, or null'),
    spend_program_id: z.string().nullable().describe('ID of the associated spend program, or null if standalone'),
    created_at: z.string().describe('When the fund was created, in ISO 8601 format'),
    state: z.string().describe('Current state of the fund: ACTIVE, ARCHIVED, SUSPENDED, or TERMINATED'),
    is_shareable: z.boolean().describe('Whether the fund is shareable among multiple users'),
    is_exempt_from_policy_agent: z.boolean().describe('Whether the fund is exempt from policy agent review'),
    overrides_spend_program: z.boolean().describe("Whether the fund's settings override those of its spend program"),
    permitted_spend_types: PermittedSpendTypesSchema.describe('Spend types permitted against this fund'),
    spending_restrictions: SpendingRestrictionsSchema.nullable().describe('Spending restrictions on the fund, or null if unrestricted'),
    balance: FundBalanceSchema.nullable().describe('Current balance of the fund, or null if unavailable'),
    cards: z.array(FundCardSchema).describe('Cards linked to the fund'),
    members: z.array(FundMemberSchema).describe('Users who can spend from the fund'),
    suspension: FundSuspensionSchema.nullable().describe('Fund-level suspension details, or null if not suspended')
});

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
    data: z.array(FundSchema),
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
            items: parsed.data,
            ...(parsed.page.next != null && { next_cursor: parsed.page.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
