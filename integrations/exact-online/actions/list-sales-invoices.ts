import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.'),
    modified_after: z.string().optional().describe('Filter invoices modified after this ISO 8601 timestamp. Example: 2024-05-30T00:00:00Z')
});

const SalesInvoiceSchema = z.object({
    InvoiceID: z.string().describe('Invoice ID. Example: 7b282ae4-d920-46b0-87fd-3da21b818780'),
    InvoiceNumber: z.number().nullish().describe('Invoice number. Example: 24700006'),
    OrderedBy: z.string().nullish().describe('Customer account GUID. Example: a58c29d9-ef92-40f1-b817-31b36990898c'),
    AmountDC: z.number().nullish().describe('Invoice amount in default currency'),
    Status: z.number().nullish().describe('Invoice status. 20=Open, 50=Processed/Posted'),
    Modified: z.string().nullish().describe('Last modified timestamp. Example: 2024-05-30T12:00:00Z')
});

const OutputSchema = z.object({
    items: z.array(SalesInvoiceSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omit if this is the last page.')
});

const action = createAction({
    description: 'List sales invoices',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-sales-invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['salesinvoices'],

    exec: async (nango, input) => {
        // https://start.exactonline.fr/docs/services/Current/Me/GET
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = z
            .object({
                d: z.object({
                    results: z.array(
                        z.object({
                            CurrentDivision: z.number()
                        })
                    )
                })
            })
            .parse(meResponse.data);

        const division = meData.d.results[0]?.CurrentDivision;

        if (!division) {
            throw new nango.ActionError({
                type: 'no_division',
                message: 'Could not determine current division from the Me endpoint.'
            });
        }

        const top = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            $top: top,
            $skip: skip,
            $orderby: 'Modified asc',
            $select: 'InvoiceID,InvoiceNumber,OrderedBy,AmountDC,Status,Modified'
        };

        if (input.modified_after) {
            params['$filter'] = `Modified gt datetime'${input.modified_after}'`;
        }

        // https://start.exactonline.fr/docs/services/SalesInvoice/GET/SalesInvoices
        const response = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/salesinvoice/SalesInvoices`,
            params,
            retries: 3
        });

        const responseSchema = z.object({
            d: z.object({
                results: z.array(z.unknown())
            })
        });

        const parsedResponse = responseSchema.parse(response.data);
        const results = parsedResponse.d.results;

        const items = results.map((item: unknown) => {
            const invoice = SalesInvoiceSchema.parse(item);
            return invoice;
        });

        const nextCursor = items.length === top ? String(skip + top) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
