import { z } from 'zod';
import { createAction } from 'nango';

const PostingInputSchema = z.object({
    account: z.object({
        id: z.number().describe('Ledger account ID. Example: 291297300')
    }),
    amount: z.number().describe('Posting amount in company currency. Use positive for debit, negative for credit (or vice versa to balance).'),
    amountCurrency: z.number().optional().describe('Posting amount in transaction currency.'),
    description: z.string().optional().describe('Line-level description.'),
    row: z.number().optional().describe('Row index for the posting. Auto-assigned starting at 1 if omitted.')
});

const InputSchema = z.object({
    date: z.string().describe('Voucher date (ISO 8601). Example: "2024-01-15"'),
    description: z.string().describe('Voucher description.'),
    postings: z.array(PostingInputSchema).min(2).describe('Balanced double-entry postings. At least two lines required.')
});

const ProviderAccountSchema = z.object({
    id: z.number(),
    number: z.number().optional(),
    name: z.string().optional()
});

const ProviderPostingSchema = z.object({
    id: z.number().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    account: ProviderAccountSchema.optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    row: z.number().optional()
});

const ProviderVoucherSchema = z.object({
    id: z.number(),
    date: z.string(),
    description: z.string(),
    number: z.number().optional(),
    year: z.number().optional(),
    postings: z.array(ProviderPostingSchema).optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderVoucherSchema
});

const OutputSchema = z.object({
    id: z.number(),
    date: z.string(),
    description: z.string(),
    number: z.number().optional(),
    year: z.number().optional(),
    postings: z.array(ProviderPostingSchema).optional()
});

const action = createAction({
    description: 'Create a manual general ledger voucher (balanced double-entry posting).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            // https://api-test.tripletex.tech/v2/swagger.json
            endpoint: 'v2/ledger/voucher',
            data: {
                date: input.date,
                description: input.description,
                postings: input.postings.map((posting, index) => ({
                    account: { id: posting.account.id },
                    amountGross: posting.amount,
                    amountGrossCurrency: posting.amountCurrency !== undefined ? posting.amountCurrency : posting.amount,
                    ...(posting.description !== undefined && { description: posting.description }),
                    ...(posting.row !== undefined && { row: posting.row }),
                    ...(posting.row === undefined && { row: index + 1 })
                }))
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'No data returned from voucher creation.'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Failed to parse voucher creation response.',
                details: parsed.error.message
            });
        }

        const voucher = parsed.data.value;

        return {
            id: voucher.id,
            date: voucher.date,
            description: voucher.description,
            ...(voucher.number !== undefined && { number: voucher.number }),
            ...(voucher.year !== undefined && { year: voucher.year }),
            ...(voucher.postings !== undefined && { postings: voucher.postings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
