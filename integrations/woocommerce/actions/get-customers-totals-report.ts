import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CustomerTotalSchema = z.object({
    slug: z.string().describe('An alphanumeric identifier for the resource. Example: "paying"'),
    name: z.string().describe('Customer type name. Example: "Paying customer"'),
    total: z.number().describe('Amount of customers. Example: 2')
});

const OutputSchema = z.array(CustomerTotalSchema);

const action = createAction({
    description: 'Retrieve the customers totals report from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-customers-totals-report',
        group: 'Reports'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const storeUrl = connection.connection_config?.['storeURL'];

        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-customers-totals
            endpoint: 'reports/customers/totals',
            ...(storeUrl &&
                typeof storeUrl === 'string' && {
                    baseUrlOverride: `https://${encodeURIComponent(storeUrl)}/wp-json/wc/v3`
                }),
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array response from the WooCommerce customers totals endpoint'
            });
        }

        const items = response.data.map((item: unknown) => {
            const parsed = CustomerTotalSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Failed to validate a customers totals report item',
                    detail: parsed.error.message
                });
            }
            return parsed.data;
        });

        return items;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
