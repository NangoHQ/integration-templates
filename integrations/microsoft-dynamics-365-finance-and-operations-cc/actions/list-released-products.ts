import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value). Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('If true, include records from all companies using cross-company=true.')
});

const ReleasedProductSchema = z
    .object({
        ItemNumber: z.string().describe('Item number. May include leading or trailing whitespace.'),
        ProductName: z.string().nullable().optional(),
        ProductGroupId: z.string().nullable().optional(),
        ItemType: z.string().nullable().optional(),
        UnitOfMeasureSymbol: z.string().nullable().optional(),
        SearchName: z.string().nullable().optional(),
        ProductNumber: z.string().nullable().optional(),
        dataAreaId: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ReleasedProductSchema),
    next_cursor: z.string().optional()
});

const OdataListResponseSchema = z.object({
    value: z.array(z.unknown())
});

const action = createAction({
    description: 'List released products (items)',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/ReleasedProductsV2',
            params,
            retries: 3
        });

        const parsedResponse = OdataListResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ReleasedProductsV2'
            });
        }

        const items = parsedResponse.data.value.map((item) => ReleasedProductSchema.parse(item));

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
