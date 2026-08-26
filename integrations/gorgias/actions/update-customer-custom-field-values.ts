import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldValueSchema = z
    .object({
        id: z.number().describe('The ID of the custom field definition to set.'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('The value to assign to the custom field.')
    })
    .describe('A single custom field value entry.');

const InputSchema = z
    .object({
        customer_id: z.number().describe('The ID of the customer whose custom field values should be updated.'),
        values: z
            .array(CustomFieldValueSchema)
            .describe('Array of custom field values to set. This fully replaces all existing custom field values on the customer.')
    })
    .describe('Input for updating customer custom field values in bulk.');

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            field: z.object({
                id: z.number(),
                label: z.string()
            }),
            value: z.union([z.string(), z.number(), z.boolean()])
        })
    )
});

const OutputItemSchema = z
    .object({
        field_id: z.number().describe('The ID of the custom field definition.'),
        field_label: z.string().describe('The label of the custom field definition.'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('The assigned value of the custom field.')
    })
    .describe('A custom field value entry on the customer.');

const OutputSchema = z.array(OutputItemSchema).describe('The updated custom field values for the customer.');

/**
 * @tags: [write, destructive]
 * @tagReason: PUT fully replaces all custom field values on the customer; omitted fields may be treated as deletion attempts.
 * @pitfalls: Passing a value outside a dropdown field's defined choices returns a 400 listing the exact valid choices. The endpoint fully replaces all custom field values, so omitting an existing managed field may be treated as an implicit delete attempt and trigger a validation error.
 */
const action = createAction({
    description: 'Set multiple custom field values on a customer in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/update-customer-custom-fields
        const response = await nango.put({
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields`,
            data: input.values,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.data.map((item) => ({
            field_id: item.field.id,
            field_label: item.field.label,
            value: item.value
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
