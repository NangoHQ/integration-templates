import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    crossCompany: z.boolean().optional().describe('Query across all companies instead of the default company.')
});

const SalesOrderSchema = z
    .object({
        dataAreaId: z.string().nullish(),
        SalesOrderNumber: z.string().nullish(),
        CustomerAccount: z.string().nullish(),
        SalesOrderName: z.string().nullish(),
        CurrencyCode: z.string().nullish(),
        SalesStatus: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(SalesOrderSchema),
    nextCursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List sales order headers',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['FinOpsERP.full_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer string.'
            });
        }

        const params: Record<string, string> = {
            $top: String(PAGE_SIZE),
            $skip: String(skip)
        };

        if (input.crossCompany) {
            params['cross-company'] = 'true';
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/SalesOrderHeadersV2',
            params,
            retries: 3
        });

        const wrapper = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = wrapper.value.map((raw: unknown) => {
            return SalesOrderSchema.parse(raw);
        });

        const hasMore = items.length === PAGE_SIZE;
        const nextCursor = hasMore ? String(skip + PAGE_SIZE) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
