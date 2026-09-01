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

const CustomFieldValueEntrySchema = z.object({
    field: z.object({ id: z.number() }).passthrough(),
    // The provider documents this as `any`; unset or non-scalar fields (e.g. multi-select) can return null or an array.
    value: z.unknown()
});

// The GET and PUT responses for this endpoint have been observed both as a bare array and as `{ data: [...] }`.
function parseCustomFieldValueEntries(data: unknown): z.infer<typeof CustomFieldValueEntrySchema>[] {
    if (Array.isArray(data)) {
        return z.array(CustomFieldValueEntrySchema).parse(data);
    }
    return z.object({ data: z.array(CustomFieldValueEntrySchema) }).parse(data).data;
}

/**
 * @tags: [write]
 * @tagReason: Performs a PUT request to update a custom field value on a customer.
 * @pitfalls: The provider's PUT endpoint fully replaces all custom field values on the customer, so this action first fetches the existing values and merges the requested one in before sending the complete set.
 */
const action = createAction({
    description: 'Set a single custom field value on a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:read', 'customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-customer-custom-fields
        const existingResponse = await nango.get({
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields`,
            retries: 3
        });

        const existingEntries = parseCustomFieldValueEntries(existingResponse.data);

        const mergedValues = existingEntries
            .filter((entry) => entry.field.id !== input.custom_field_id)
            .map((entry) => ({ id: entry.field.id, value: entry.value }));
        mergedValues.push({ id: input.custom_field_id, value: input.value });

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-customer-custom-fields
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields`,
            data: mergedValues,
            retries: 3
        });

        const updatedEntries = parseCustomFieldValueEntries(response.data);

        const updatedResult = updatedEntries.find((entry) => entry.field.id === input.custom_field_id);
        if (!updatedResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No custom field value was updated.'
            });
        }

        return {
            customer_id: input.customer_id,
            custom_field_id: input.custom_field_id,
            value: z.union([z.string(), z.number(), z.boolean()]).parse(updatedResult.value)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
