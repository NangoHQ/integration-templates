import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor returned as `next_cursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing external bank accounts linked to the business.');

const ProviderBankAccountSchema = z.object({
    id: z.string(),
    account_name: z.string(),
    account_number_last_four: z.string(),
    account_subtype: z.string(),
    connection_provider: z.string(),
    financial_institution_name: z.string().nullable(),
    has_ach_details: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderBankAccountSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const BankAccountSchema = z.object({
    id: z.string().describe('Unique identifier of the bank account. Example: "9128effa-03f6-4302-b895-3468ab319cd2"'),
    account_name: z.string().describe('Display name of the linked bank account. Example: "Brown Ltd"'),
    account_number_last_four: z.string().describe('Last four digits of the account number. Example: "6653"'),
    account_subtype: z.string().describe('Bank account subtype reported by the provider. Example: "checking"'),
    connection_provider: z
        .string()
        .describe('How the account was linked: one of "finicity", "manual", "plaid", "ramp_brokerage", "ramp_wallet", or "teller". Example: "manual"'),
    financial_institution_name: z
        .string()
        .optional()
        .describe('Name of the associated financial institution. Absent when unknown (for example manually-added accounts).'),
    has_ach_details: z
        .boolean()
        .describe('Whether Ramp has ACH routing and account numbers for this account; external accounts without ACH details cannot fund USD payments.')
});

const OutputSchema = z
    .object({
        items: z.array(BankAccountSchema).describe('Linked bank accounts returned for this page.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass back as `cursor` to fetch the next page. Absent when there are no more results.')
    })
    .describe('A page of external bank accounts linked to the business, with an optional cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads the business's externally-linked bank accounts; performs no provider mutation.
 * @pitfalls: Returns only externally-linked funding accounts and includes no balance data, so it cannot be used to check account balances.
 */
const action = createAction({
    description: 'List external bank accounts linked to the business.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bank-accounts)
            endpoint: '/developer/v1/bank-accounts',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((account) => ({
            id: account.id,
            account_name: account.account_name,
            account_number_last_four: account.account_number_last_four,
            account_subtype: account.account_subtype,
            connection_provider: account.connection_provider,
            ...(account.financial_institution_name != null && { financial_institution_name: account.financial_institution_name }),
            has_ach_details: account.has_ach_details
        }));

        const nextCursor = parsed.page.next !== null ? new URL(parsed.page.next).searchParams.get('start') : null;

        return {
            items,
            ...(nextCursor !== null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
