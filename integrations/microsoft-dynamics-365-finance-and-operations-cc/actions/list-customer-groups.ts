import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCustomerGroupSchema = z
    .object({
        CustomerGroupId: z.string()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(ProviderCustomerGroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer groups (used as CustomerGroupId on customers).',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['DataEntities.Read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerGroups',
            params: {
                $top: String(limit),
                ...(skip > 0 && { $skip: String(skip) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.value.map((item: unknown) => {
            return ProviderCustomerGroupSchema.parse(item);
        });

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
