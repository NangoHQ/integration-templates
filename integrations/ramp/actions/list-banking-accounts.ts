import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.'),
        page_size: z
            .number()
            .int()
            .min(2)
            .max(100)
            .optional()
            .describe('Number of accounts to return per page (between 2 and 100). Defaults to 20 when omitted.')
    })
    .describe("Filters for listing Ramp's Business/Treasury accounts, including optional pagination.");

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    account_type: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAccountSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const AccountSchema = z.object({
    id: z.string().describe('Unique identifier of the treasury account.'),
    name: z.string().describe('Display name of the treasury account. Example: "Checking Account".'),
    account_type: z
        .string()
        .describe(
            'Type of the treasury account. Known values: "WALLET_ACCOUNT" (checking), "BROKERAGE_ACCOUNT" (self-directed brokerage), "MANAGED_PORTFOLIO_ACCOUNT" (managed investment portfolio).'
        )
});

const OutputSchema = z
    .object({
        accounts: z.array(AccountSchema).describe("Ramp's own Business/Treasury accounts (wallet, brokerage, and investment) for the business."),
        next_cursor: z
            .string()
            .optional()
            .describe('Cursor to pass as cursor on the next call to fetch the following page. Absent when there are no more pages.')
    })
    .describe("A page of Ramp's Business/Treasury accounts plus the cursor for the next page.");

/**
 * @tags: [read]
 * @tagReason: Reads the list of Treasury accounts from the provider and modifies no provider data.
 * @pitfalls: page_size must be between 2 and 100 (defaults to 20) or the provider rejects the request; next_cursor is absent on the final page, so callers must stop when it is missing.
 */
const action = createAction({
    description: "List Ramp's own Business Account / Treasury accounts (wallet, brokerage, investment).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['treasury:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/banking/accounts
            endpoint: '/developer/v1/banking/accounts',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed.page.next != null) {
            const start = new URL(parsed.page.next).searchParams.get('start');
            if (start != null && start !== '') {
                nextCursor = start;
            }
        }

        return {
            accounts: parsed.data.map((account) => ({
                id: account.id,
                name: account.name,
                account_type: account.account_type
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
