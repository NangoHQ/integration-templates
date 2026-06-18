import { z } from 'zod';
import { createAction } from 'nango';

const OrderStatusSchema = z.object({
    id: z.number(),
    name: z.string(),
    system_label: z.string(),
    custom_label: z.string().optional()
});

const OutputSchema = z.object({
    statuses: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            system_label: z.string(),
            custom_label: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List all available order statuses.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/list-order-statuses',
        method: 'GET'
    },
    input: z.object({}),
    output: OutputSchema,
    scopes: ['store_v2_orders'],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/orders#get-all-order-statuses
            endpoint: '/v2/order_statuses',
            retries: 3
        });

        if (response.status === 204) {
            return {
                statuses: []
            };
        }

        const statuses = z.array(OrderStatusSchema).parse(response.data);

        return {
            statuses: statuses.map((status) => ({
                id: status.id,
                name: status.name,
                system_label: status.system_label,
                ...(status.custom_label !== undefined && { custom_label: status.custom_label })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
