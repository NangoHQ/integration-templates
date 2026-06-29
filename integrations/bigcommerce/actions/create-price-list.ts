import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The unique name of the Price List. Example: "Wholesale"'),
    active: z.boolean().optional().describe('Boolean value that specifies whether this Price List and its prices are active or not. Defaults to true.')
});

const ProviderPriceListSchema = z.object({
    id: z.number(),
    date_created: z.string(),
    date_modified: z.string(),
    name: z.string(),
    active: z.boolean()
});

const OutputSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    name: z.string().optional(),
    active: z.boolean().optional()
});

const action = createAction({
    description: 'Create a price list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.bigcommerce.com/docs/rest-management/pricelists
            endpoint: '/v3/pricelists',
            data: {
                name: input.name,
                ...(input.active !== undefined && { active: input.active })
            },
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from BigCommerce API: missing data object.'
            });
        }

        const rawData = responseData.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from BigCommerce API: missing data object.'
            });
        }

        const providerPriceList = ProviderPriceListSchema.parse(rawData);

        return {
            id: providerPriceList.id,
            ...(providerPriceList.date_created !== undefined && { date_created: providerPriceList.date_created }),
            ...(providerPriceList.date_modified !== undefined && { date_modified: providerPriceList.date_modified }),
            ...(providerPriceList.name !== undefined && { name: providerPriceList.name }),
            ...(providerPriceList.active !== undefined && { active: providerPriceList.active })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
