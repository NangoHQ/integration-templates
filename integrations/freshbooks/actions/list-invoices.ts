import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    account_id: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.'),
    date_from: z.string().optional().describe('Start date filter. Format: YYYY-MM-DD.'),
    date_to: z.string().optional().describe('End date filter. Format: YYYY-MM-DD.'),
    updated_since: z.string().optional().describe('Filter for invoices updated since this timestamp. Format: YYYY-MM-DDTHH:MM:SS.')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.number(),
        customerid: z.number().optional(),
        number: z.string().optional(),
        status: z.number().optional(),
        create_date: z.string().optional(),
        update_date: z.string().optional(),
        due_date: z.string().optional(),
        amount: z
            .object({
                amount: z.string().optional(),
                code: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderInvoiceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountId = metadata.account_id;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_id is required in connection metadata. Run get-account-id first.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing the page number.'
            });
        }

        const params: Record<string, string | number> = {
            page: page,
            per_page: input.per_page ?? 100
        };

        if (input.date_from) {
            params['search[date_from]'] = input.date_from;
        }
        if (input.date_to) {
            params['search[date_to]'] = input.date_to;
        }
        if (input.updated_since) {
            params['search[updated_since]'] = input.updated_since;
        }

        // https://www.freshbooks.com/api/invoices
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices`,
            params: params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            response: z.object({
                result: z.object({
                    invoices: z.array(z.unknown()),
                    page: z.number(),
                    pages: z.number(),
                    per_page: z.number(),
                    total: z.number()
                })
            })
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.',
                details: parsed.error.issues
            });
        }

        const result = parsed.data.response.result;
        const invoices = result.invoices.map((item) => ProviderInvoiceSchema.parse(item));

        return {
            items: invoices,
            ...(result.page < result.pages && { next_cursor: String(result.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
