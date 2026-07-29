import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company code / data area. Example: "dat"'),
    invoiceIdentifier: z.string().optional().describe('Invoice identifier to scope lines to a single parent invoice. Example: "5637144588"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FreeTextInvoiceLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        ParentRecId: z.number().optional(),
        LineNumber: z.number().optional(),
        Description: z.string().optional(),
        Quantity: z.number().optional(),
        UnitPrice: z.number().optional(),
        Amount: z.number().optional(),
        CurrencyCode: z.string().optional(),
        SalesTaxGroup: z.string().optional(),
        ItemSalesTaxGroup: z.string().optional(),
        MainAccount: z.string().optional(),
        LedgerDimension: z.string().optional(),
        TaxAmount: z.number().optional(),
        LineAmount: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(FreeTextInvoiceLineSchema),
    next_cursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List free text invoice lines, optionally scoped to a parent invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['DynamicsOData.full_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const dataAreaId = input.dataAreaId ?? 'dat';
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const filters: string[] = [`dataAreaId eq '${dataAreaId}'`];
        if (input.invoiceIdentifier) {
            filters.push(`ParentRecId eq ${input.invoiceIdentifier}`);
        }

        const filter = filters.join(' and ');

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/FreeTextInvoiceLines',
            params: {
                $filter: filter,
                $top: String(PAGE_SIZE),
                $skip: String(skip)
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider'
            });
        }

        const rawRecord = raw;
        const rawValue = Array.isArray(rawRecord['value']) ? rawRecord['value'] : [];

        const items = rawValue.map((item: unknown) => {
            if (typeof item !== 'object' || item === null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Expected object in response value array'
                });
            }
            return FreeTextInvoiceLineSchema.parse(item);
        });

        const hasMore = items.length === PAGE_SIZE;
        const nextCursor = hasMore ? String(skip + PAGE_SIZE) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
