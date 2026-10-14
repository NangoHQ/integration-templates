import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        fund_id: z.string().describe('Unique identifier of the fund to terminate. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731"')
    })
    .describe('Input identifying the fund to permanently terminate.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 10000'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"')
});

const PermittedSpendTypesSchema = z.object({
    physical_card_enabled: z.boolean().describe('Whether a physical card can be linked to this fund.'),
    virtual_card_enabled: z.boolean().describe('Whether a virtual card can be linked to this fund.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against this fund.')
});

const FundCardSchema = z.object({
    card_id: z.string().describe('Unique identifier of the linked card.'),
    display_name: z.string().describe('Display name of the card.'),
    last_four: z.string().describe('Last four digits of the card number, or "*REDACTED*" once the card is terminated.'),
    expiration: z.string().describe('Card expiration in MMYY format, or "*REDACTED*" once the card is terminated.'),
    user_id: z.string().describe('Unique identifier of the cardholder.'),
    created_at: z.string().describe('ISO 8601 timestamp at which the card was created.')
});

const FundMemberSchema = z.object({
    user_id: z.string().describe('Unique identifier of a member who can spend from the fund.')
});

const FundBalanceSchema = z.object({
    cleared: CurrencyAmountSchema.describe('Cleared amount on the fund.'),
    pending: CurrencyAmountSchema.describe('Pending amount towards the fund.'),
    total: CurrencyAmountSchema.describe('Total amount on the fund.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the terminated fund.'),
        display_name: z.string().describe('Display name of the fund.'),
        state: z.string().describe('Current state of the fund after termination. Example: "TERMINATED"'),
        created_at: z.string().describe('ISO 8601 timestamp at which the fund was created.'),
        entity_id: z.string().nullable().describe('Associated business entity, or null if not scoped to an entity.'),
        spend_program_id: z.string().nullable().describe('Associated spend program, or null if none.'),
        is_shareable: z.boolean().describe('Whether the fund is shareable among multiple users.'),
        is_exempt_from_policy_agent: z.boolean().describe('Whether the fund is exempt from policy agent review.'),
        permitted_spend_types: PermittedSpendTypesSchema.describe('Spend types that were permitted on the fund.'),
        cards: z.array(FundCardSchema).describe('Cards that were linked to the fund, with sensitive fields redacted after termination.'),
        members: z.array(FundMemberSchema).describe('Members who could spend from the fund.'),
        balance: FundBalanceSchema.nullable().describe('Fund balance, or null when unavailable.')
    })
    .describe('The terminated fund, including any cards that were terminated with it.');

const ProviderFundSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    state: z.string(),
    created_at: z.string(),
    entity_id: z.string().nullable(),
    spend_program_id: z.string().nullable(),
    is_shareable: z.boolean(),
    is_exempt_from_policy_agent: z.boolean(),
    permitted_spend_types: PermittedSpendTypesSchema,
    cards: z.array(FundCardSchema),
    members: z.array(FundMemberSchema),
    balance: FundBalanceSchema.nullable()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Terminates (soft-deletes) a spend-limit fund and cascades termination to any cards issued against it, a difficult-to-reverse provider mutation.
 * @pitfalls: Termination is a soft delete, so the fund stays retrievable with state "TERMINATED" instead of being removed, and it cannot be undone; any cards issued against the fund are cascade-terminated and dropped from its card list, with their last_four/expiration redacted to "*REDACTED*".
 */
const action = createAction({
    description: 'Permanently terminate a fund (spend limit), including any cards issued against it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.ramp.com/developer-api/v1/api/funds
            endpoint: `/developer/v1/funds/${encodeURIComponent(input.fund_id)}`,
            // Terminating an already-terminated fund is idempotent (it returns 200 with state "TERMINATED"), so a small retry is safe.
            retries: 3
        });

        const fund = ProviderFundSchema.parse(response.data);

        return {
            id: fund.id,
            display_name: fund.display_name,
            state: fund.state,
            created_at: fund.created_at,
            entity_id: fund.entity_id,
            spend_program_id: fund.spend_program_id,
            is_shareable: fund.is_shareable,
            is_exempt_from_policy_agent: fund.is_exempt_from_policy_agent,
            permitted_spend_types: fund.permitted_spend_types,
            cards: fund.cards,
            members: fund.members,
            balance: fund.balance
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
