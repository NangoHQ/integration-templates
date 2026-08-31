import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.number().describe('The ID of the customer whose custom field values to list.')
    })
    .describe('Input for listing custom field values on a customer.');

const CustomFieldDefinitionSchema = z.object({
    id: z.number(),
    external_id: z.string().nullable().optional(),
    object_type: z.string().optional(),
    label: z.string().optional(),
    description: z.string().nullable().optional(),
    priority: z.number().optional(),
    required: z.boolean().optional(),
    managed_type: z.string().nullable().optional(),
    definition: z.unknown().optional(),
    created_datetime: z.string().optional(),
    updated_datetime: z.string().optional(),
    deactivated_datetime: z.string().nullable().optional()
});

const CustomFieldValueSchema = z.object({
    field: CustomFieldDefinitionSchema,
    value: z.unknown()
});

const OutputSchema = z
    .array(
        z.object({
            custom_field_id: z.number().describe('The ID of the custom field definition.'),
            label: z.string().optional().describe('The name of the custom field.'),
            value: z.unknown().describe('The value of the custom field for this customer.')
        })
    )
    .describe('List of custom field values set on the customer.');

/**
 * @tags: [read]
 * @tagReason: Reads the existing custom field values from the provider without making any changes.
 */
const action = createAction({
    description: 'List all custom field values set on a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-customer-custom-fields-values
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields`,
            retries: 3
        });

        let rawData: unknown[] = [];
        if (Array.isArray(response.data)) {
            rawData = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
            const wrappedData = z.object({ data: z.array(z.unknown()) }).safeParse(response.data);
            if (wrappedData.success) {
                rawData = wrappedData.data.data;
            }
        }

        return rawData.map((item) => {
            const parsed = CustomFieldValueSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response shape from provider custom-fields endpoint.'
                });
            }
            return {
                custom_field_id: parsed.data.field.id,
                ...(parsed.data.field.label !== undefined && { label: parsed.data.field.label }),
                value: parsed.data.value
            };
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
