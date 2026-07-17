import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('The ID of the customer profile to delete. Example: "E625FFQMHVSZJAW84DKYFF6Y8R"'),
    version: z.number().optional().describe('The current version of the customer profile for optimistic concurrency. Example: 0')
});

const ProviderDeleteSchema = z.object({
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    customer_id: z.string().describe('The ID of the deleted customer profile.'),
    success: z.boolean().describe('Whether the deletion was successful.')
});

const action = createAction({
    description: 'Delete a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.squareup.com/reference/square/customers-api/delete-customer
            endpoint: `/v2/customers/${encodeURIComponent(input.customer_id)}`,
            params: {
                ...(input.version !== undefined && { version: String(input.version) })
            },
            retries: 3
        });

        const parsed = ProviderDeleteSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Square API returned errors during customer deletion.',
                errors: parsed.errors
            });
        }

        return {
            customer_id: input.customer_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
