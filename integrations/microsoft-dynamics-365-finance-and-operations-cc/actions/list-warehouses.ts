import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const WarehouseSchema = z
    .object({
        '@odata.etag': z.string().optional(),
        dataAreaId: z.string().optional(),
        WarehouseId: z.string().optional(),
        WarehouseName: z.string().optional(),
        OperationalSiteId: z.string().optional(),
        WarehouseType: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(WarehouseSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List warehouses.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Warehouses',
            params: {
                $top: 100,
                ...(input.cursor && { $skip: input.cursor }),
                'cross-company': 'true'
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            value: z.array(z.unknown())
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.value.map((item: unknown) => WarehouseSchema.parse(item));

        const hasNext = parsed.value.length === 100;
        const nextCursor = hasNext ? String((Number(input.cursor) || 0) + 100) : undefined;

        return {
            items,
            ...(nextCursor && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
