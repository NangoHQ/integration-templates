import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.number().describe('The ID of the customer whose custom field value should be updated.'),
        custom_field_id: z.number().describe('The ID of the custom field definition to update.'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('The new scalar value to set for the custom field.')
    })
    .describe('Input for updating a single custom field value on a customer.');

const OutputSchema = z
    .object({
        customer_id: z.number().describe('The ID of the customer whose custom field was updated.'),
        custom_field_id: z.number().describe('The ID of the custom field that was updated.'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('The value that was set for the custom field.')
    })
    .describe('Output confirming the updated custom field value on a customer.');

/**
 * @tags: [write]
 * @tagReason: Performs a PUT request to update a custom field value on a customer.
 */
const action = createAction({
    description: 'Set a single custom field value on a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-customer-custom-fields
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields`,
            data: [
                {
                    id: input.custom_field_id,
                    value: input.value
                }
            ],
            retries: 3
        });

        const responseData = z
            .object({
                data: z.array(
                    z.object({
                        value: z.union([z.string(), z.number(), z.boolean()])
                    })
                )
            })
            .parse(response.data);

        const firstResult = responseData.data[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No custom field value was updated.'
            });
        }

        return {
            customer_id: input.customer_id,
            custom_field_id: input.custom_field_id,
            value: firstResult.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
