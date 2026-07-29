import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    top: z.number().optional().describe('Maximum number of records to return. Defaults to 100.')
});

const ProviderCustomerGroupSchema = z
    .object({
        CustomerGroupId: z.string(),
        Description: z.string().nullable().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderCustomerGroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer groups (used as CustomerGroupId on customers).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const top = input.top ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerGroups',
            params: {
                $top: String(top),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            return ProviderCustomerGroupSchema.parse(item);
        });

        const next_cursor = providerResponse['@odata.nextLink'] ? String(skip + top) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
