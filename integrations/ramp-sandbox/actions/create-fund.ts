import { z } from 'zod';
import { createAction } from 'nango';

import { FundSchema, IntervalSchema, ProviderFundSchema, mapFund } from '../helpers/funds.js';

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
