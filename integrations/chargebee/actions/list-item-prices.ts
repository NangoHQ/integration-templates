import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().optional().describe('Filter by item ID. Example: "basic-plan"'),
    item_family_id: z.string().optional().describe('Filter by item family ID. Example: "saas-plans"'),
    item_type: z.string().optional().describe('Filter by item type. Example: "plan"'),
    item_type_operator: z.enum(['is', 'is_not']).optional().describe('Operator for item_type filter. Default: is'),
    currency_code: z.string().optional().describe('Filter by currency code. Example: "USD"'),
    pricing_model: z.string().optional().describe('Filter by pricing model. Example: "flat_fee"'),
    status: z.string().optional().describe('Filter by status. Example: "active"'),
    status_operator: z.enum(['is', 'is_not']).optional().describe('Operator for status filter. Default: is'),
    updated_at_gt: z.number().optional().describe('Filter by updated_at greater than. Unix epoch seconds.'),
    updated_at_lt: z.number().optional().describe('Filter by updated_at less than. Unix epoch seconds.'),
    updated_at_gte: z.number().optional().describe('Filter by updated_at greater than or equal. Unix epoch seconds.'),
    updated_at_lte: z.number().optional().describe('Filter by updated_at less than or equal. Unix epoch seconds.'),
    cursor: z.string().optional().describe('Pagination offset cursor from the previous response.'),
    limit: z.number().optional().describe('Number of records to return. Max 100.')
});

const ItemPriceSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        item_id: z.string().optional(),
        item_family_id: z.string().optional(),
        item_type: z.string().optional(),
        status: z.string().optional(),
        external_name: z.string().optional(),
        pricing_model: z.string().optional(),
        price: z.number().optional(),
        period_unit: z.string().optional(),
        period: z.number().optional(),
        currency_code: z.string().optional(),
        trial_period: z.number().optional(),
        trial_period_unit: z.string().optional(),
        free_quantity: z.number().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        created_at: z.number().optional(),
        is_deleted: z.boolean().optional(),
        object: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    list: z.array(ItemPriceSchema),
    next_offset: z.string().optional().describe('Offset cursor for the next page.')
});

const action = createAction({
    description: 'List item prices (Product Catalog 2.0).',
    version: '1.0.0',
    endpoint: {
        path: '/actions/list-item-prices',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const isObject = (value: unknown): value is Record<string, unknown> => {
            return typeof value === 'object' && value !== null;
        };

        const params: Record<string, string | number> = {};

        if (input.item_id !== undefined) {
            params['item_id'] = input.item_id;
        }
        if (input.item_family_id !== undefined) {
            params['item_family_id'] = input.item_family_id;
        }
        if (input.item_type !== undefined) {
            const operator = input.item_type_operator ?? 'is';
            params[`item_type[${operator}]`] = input.item_type;
        }
        if (input.currency_code !== undefined) {
            params['currency_code'] = input.currency_code;
        }
        if (input.pricing_model !== undefined) {
            params['pricing_model'] = input.pricing_model;
        }
        if (input.status !== undefined) {
            const operator = input.status_operator ?? 'is';
            params[`status[${operator}]`] = input.status;
        }
        if (input.updated_at_gt !== undefined) {
            params['updated_at[gt]'] = input.updated_at_gt;
        }
        if (input.updated_at_lt !== undefined) {
            params['updated_at[lt]'] = input.updated_at_lt;
        }
        if (input.updated_at_gte !== undefined) {
            params['updated_at[gte]'] = input.updated_at_gte;
        }
        if (input.updated_at_lte !== undefined) {
            params['updated_at[lte]'] = input.updated_at_lte;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/item_prices
            endpoint: '/api/v2/item_prices',
            params,
            retries: 3
        });

        const data: unknown = response.data;
        if (!isObject(data) || !Array.isArray(data['list'])) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Chargebee API: expected list array'
            });
        }

        const parsedList = z.array(z.object({ item_price: ItemPriceSchema })).safeParse(data['list']);
        if (!parsedList.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse item prices response',
                details: parsedList.error.message
            });
        }

        const result: { list: z.infer<typeof ItemPriceSchema>[]; next_offset?: string } = {
            list: parsedList.data.map((entry) => entry.item_price)
        };

        if (typeof data['next_offset'] === 'string' && data['next_offset'].length > 0) {
            result.next_offset = data['next_offset'];
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
