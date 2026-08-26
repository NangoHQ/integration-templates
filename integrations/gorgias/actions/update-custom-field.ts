import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_field_id: z.number().describe('The ID of the custom field to update.'),
        label: z.string().optional().describe('The name of the custom field. Max 255 characters.'),
        description: z.string().optional().describe('The description of the custom field. Max 1024 characters.'),
        priority: z.number().optional().describe('Order in which custom fields are displayed. 0-5000.'),
        required: z.boolean().optional().describe('Whether this custom field is required.'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 datetime to deactivate the custom field. Omit to keep active.'),
        definition: z
            .object({ data_type: z.string().describe('The data type of the custom field definition.') })
            .passthrough()
            .optional()
            .describe('The settings for this custom field, dependent on the data type.')
    })
    .describe('Input to update a custom field definition');

const ProviderCustomFieldSchema = z.object({
    id: z.number(),
    external_id: z.string().nullable().optional(),
    object_type: z.string(),
    label: z.string(),
    description: z.string().nullable().optional(),
    priority: z.number(),
    required: z.boolean(),
    managed_type: z.string().nullable().optional(),
    definition: z.object({ data_type: z.string() }).passthrough(),
    created_datetime: z.string(),
    updated_datetime: z.string(),
    deactivated_datetime: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the custom field.'),
        external_id: z.string().optional().describe('ID of the custom field in a foreign system.'),
        object_type: z.string().describe('Type of entity on which to use this custom field.'),
        label: z.string().describe('The name of the custom field.'),
        description: z.string().optional().describe('The description of the custom field.'),
        priority: z.number().describe('Order in which custom fields are displayed.'),
        required: z.boolean().describe('Whether this custom field is required.'),
        managed_type: z.string().optional().describe('The type of the managed field.'),
        definition: z
            .object({ data_type: z.string().describe('The data type of the custom field definition.') })
            .passthrough()
            .describe('The settings for this custom field, dependent on the data type.'),
        created_datetime: z.string().describe('When the custom field was created.'),
        updated_datetime: z.string().describe('When the custom field was last updated.'),
        deactivated_datetime: z.string().optional().describe('When the custom field was deactivated.')
    })
    .describe('The updated custom field');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the custom field definition. Deactivation is the de facto delete for this resource since the API does not expose a DELETE endpoint.
 * @pitfalls: The provider does not support deleting custom fields; setting deactivated_datetime deactivates them but the record remains in the account. Reactivation is possible by clearing that field.
 */
const action = createAction({
    description: 'Update a custom field definition, or deactivate it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.label !== undefined) {
            body['label'] = input.label;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.priority !== undefined) {
            body['priority'] = input.priority;
        }
        if (input.required !== undefined) {
            body['required'] = input.required;
        }
        if (input.deactivated_datetime !== undefined) {
            body['deactivated_datetime'] = input.deactivated_datetime;
        }
        if (input.definition !== undefined) {
            body['definition'] = input.definition;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-custom-field
            endpoint: `/api/custom-fields/${encodeURIComponent(input.custom_field_id)}`,
            data: body,
            retries: 3
        });

        const customField = ProviderCustomFieldSchema.parse(response.data);

        return {
            id: customField.id,
            ...(customField.external_id != null && { external_id: customField.external_id }),
            object_type: customField.object_type,
            label: customField.label,
            ...(customField.description != null && { description: customField.description }),
            priority: customField.priority,
            required: customField.required,
            ...(customField.managed_type != null && { managed_type: customField.managed_type }),
            definition: customField.definition,
            created_datetime: customField.created_datetime,
            updated_datetime: customField.updated_datetime,
            ...(customField.deactivated_datetime != null && { deactivated_datetime: customField.deactivated_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
