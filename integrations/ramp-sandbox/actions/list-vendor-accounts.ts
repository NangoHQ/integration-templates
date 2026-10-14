import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        vendor_id: z.string().min(1).describe('Ramp vendor ID whose on-file bank accounts to list. Example: "effa4ecc-59f7-423b-9747-56dafc7c66da".'),
        cursor: z.string().min(1).optional().describe('Pagination cursor from a previous response next_cursor. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of accounts to return per page, between 2 and 100. Defaults to 20.')
    })
    .describe("Input for listing a vendor's on-file bank accounts.");

const ProviderVendorBankAccountSchema = z.object({
    id: z.string(),
    account_nickname: z.string().nullable().optional(),
    account_number_last_four: z.string().nullable(),
    currency: z.string(),
    is_default: z.boolean().optional(),
    payment_method: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVendorBankAccountSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    id: z.string().describe('Unique identifier of the vendor bank account.'),
                    account_nickname: z.string().nullable().optional().describe('Nickname of the vendor bank account, or null when none is set.'),
                    account_number_last_four: z
                        .string()
                        .nullable()
                        .describe('Last four digits of the bank account number, or null when the payment method does not expose one.'),
                    currency: z.string().describe('ISO 4217 currency code of the account. Example: "USD".'),
                    is_default: z.boolean().optional().describe("Whether this is the vendor's default bank account."),
                    payment_method: z.string().describe('Payment method supported by the account. Example: "ACH".')
                })
            )
            .describe('Bank accounts on file for the vendor, usable as payment destinations for bills.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Absent when there are no more accounts.')
    })
    .describe("A vendor's on-file bank accounts and the cursor for the next page.");

/**
 * @tags: [read]
 * @tagReason: Reads a vendor's existing bank accounts from the provider without modifying any data.
 * @pitfalls: A vendor with no bank accounts on file returns an empty items list rather than an error, and account_number_last_four and account_nickname can be null even for real accounts; vendor names are not unique, so confirm the exact vendor_id before listing.
 */
const action = createAction({
    description: "List a vendor's bank accounts on file, used as payment destinations for bills.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/vendors/{vendor_id}/accounts
            endpoint: `/developer/v1/vendors/${encodeURIComponent(input.vendor_id)}/accounts`,
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((account) => ({
            id: account.id,
            account_nickname: account.account_nickname,
            account_number_last_four: account.account_number_last_four,
            currency: account.currency,
            is_default: account.is_default,
            payment_method: account.payment_method
        }));

        let next_cursor: string | undefined;
        if (parsed.page.next !== null) {
            const nextUrl = new URL(parsed.page.next);
            const start = nextUrl.searchParams.get('start');
            if (start !== null) {
                next_cursor = start;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
