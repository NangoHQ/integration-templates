import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    top: z.number().min(1).max(10000).optional().describe('Deprecated alias for limit, kept for backward compatibility.'),
    cross_company: z.boolean().optional().describe('If true, query across all companies instead of just the default company.')
});

const TaxGroupSchema = z.object({
    '@odata.etag': z.string().optional(),
    dataAreaId: z.string().optional(),
    TaxGroupCode: z.string(),
    Description: z.string().optional(),
    DefaultCriteriaCityId: z.string().optional(),
    DefaultCriteriaCountyId: z.string().optional(),
    TaxReverseOnCashDiscount: z.string().optional(),
    DefaultCriteriaCountryId: z.string().optional(),
    MandatorySalesDate_W: z.string().optional(),
    FillSalesDate_W: z.string().optional(),
    DefaultCriteriaZipCodeId: z.string().optional(),
    EUTrade_W: z.string().optional(),
    DateOfVATRegisterFilling: z.string().optional(),
    InvoicePrintDetails: z.string().optional(),
    RoundingBy: z.string().optional(),
    DefaultCriteriaStateId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TaxGroupSchema),
    next_cursor: z.string().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const action = createAction({
    description: 'List sales tax groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['DataEntities.Data.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? input.top ?? 100;
        const params: Record<string, string | number> = {
            $top: limit
        };

        if (input.cursor) {
            params['$skip'] = input.cursor;
        }

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/TaxGroups',
            params,
            retries: 3
        });

        const raw = response.data;
        if (!isRecord(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from TaxGroups endpoint'
            });
        }

        const value = Array.isArray(raw['value']) ? raw['value'] : [];
        const nextLink = raw['@odata.nextLink'];

        const items = value.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item shape in TaxGroups response'
                });
            }
            return TaxGroupSchema.parse(item);
        });

        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        let nextCursor: string | undefined;
        if (typeof nextLink === 'string') {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const url = new URL(nextLink);
            const skipParam = url.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + limit);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
