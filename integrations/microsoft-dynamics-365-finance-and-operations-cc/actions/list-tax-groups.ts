import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.')
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
        const limit = input.limit ?? 100;
        const params: Record<string, string | number> = {
            $top: limit
        };

        if (input.cursor) {
            params['$skip'] = input.cursor;
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

        let nextCursor: string | undefined;
        if (typeof nextLink === 'string') {
            const url = new URL(nextLink);
            const skip = url.searchParams.get('$skip');
            if (skip) {
                nextCursor = skip;
            }
        }

        const items = value.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item shape in TaxGroups response'
                });
            }
            return TaxGroupSchema.parse(item);
        });

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
