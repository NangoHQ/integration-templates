import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters required for this action.');

const OutputSchema = z
    .object({
        count: z.number().describe('The total number of customers in the store.')
    })
    .describe('The total count of customers.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the total count of customers from the provider API with no mutation.
 * @pitfalls: Count includes auto-created customers from order operations that are permanently undeletable via API, so the total may appear inflated.
 */
const action = createAction({
    description: 'Get the total count of customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, _input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer-customer-count
            endpoint: '/admin/openapi/v20260601/customers/v2/count.json',
            retries: 3
        });

        const providerResponse = z
            .object({
                count: z.number()
            })
            .parse(response.data);

        return {
            count: providerResponse.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
