import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('OData nextLink cursor from the previous response. Omit for the first page.')
});

const UnitOfMeasureSchema = z
    .object({
        UnitSymbol: z.string(),
        UnitDescription: z.string().optional(),
        UnitClass: z.string().optional(),
        DecimalPrecision: z.number().optional(),
        IsBaseUnit: z.string().optional(),
        SystemOfUnits: z.string().optional(),
        IsSystemUnit: z.string().optional(),
        IsFixedUnitSymbolAssigned: z.string().optional(),
        FixedUnitSymbolAssignment: z.string().optional(),
        NationalCode: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(UnitOfMeasureSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List units of measure.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/UnitsOfMeasure',
            params: {
                ...(input.cursor && { $skiptoken: input.cursor })
            },
            retries: 3
        });

        const ODataResponseSchema = z.object({
            value: z.array(z.unknown()).optional(),
            '@odata.nextLink': z.string().optional()
        });

        const data = ODataResponseSchema.parse(response.data);
        const rawItems = data.value ?? [];
        const items = rawItems.map((item) => UnitOfMeasureSchema.parse(item));

        let next_cursor: string | undefined;
        if (data['@odata.nextLink']) {
            const url = new URL(data['@odata.nextLink']);
            const skipToken = url.searchParams.get('$skiptoken');
            if (skipToken) {
                next_cursor = skipToken;
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
