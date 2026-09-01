import { z } from 'zod';
import { createAction } from 'nango';

const ProviderInputSettingsSchema = z
    .object({
        input_type: z.string().nullable().optional()
    })
    .passthrough();

const ProviderDefinitionSchema = z
    .object({
        data_type: z.string().nullable().optional(),
        input_settings: ProviderInputSettingsSchema.nullable().optional()
    })
    .passthrough();

const ProviderCustomFieldSchema = z
    .object({
        id: z.number(),
        object_type: z.string(),
        label: z.string(),
        description: z.string().nullable().optional(),
        priority: z.number().nullable().optional(),
        required: z.boolean().nullable().optional(),
        definition: ProviderDefinitionSchema.nullable().optional(),
        created_datetime: z.string().nullable().optional(),
        updated_datetime: z.string().nullable().optional()
    })
    .passthrough();

const InputSchema = z
    .object({
        object_type: z.enum(['Ticket', 'Customer']).describe('The type of object the custom field applies to. Must be "Ticket" or "Customer", case-sensitive.'),
        label: z.string().describe('The display label for the custom field.'),
        description: z.string().describe('A description of the custom field.'),
        priority: z.number().describe('The display priority of the custom field. Lower values appear first.'),
        required: z.boolean().describe('Whether the custom field is required when creating or updating the object.'),
        definition: z
            .object({
                data_type: z.string().describe('The data type of the custom field. For example, "text".'),
                input_settings: z
                    .object({
                        input_type: z.string().describe('The input widget type for the custom field. For text fields, use "input" (not "text_field").')
                    })
                    .passthrough()
                    .describe(
                        'Settings that control how the field is rendered in the UI. Additional field-specific settings are forwarded to the provider as-is, e.g. `choices` for dropdown fields or `default`/`min`/`max` for number fields.'
                    )
            })
            .describe('The type definition and UI settings for the custom field.')
    })
    .describe('Input for creating a custom field definition on tickets or customers.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the created custom field.'),
        object_type: z.string().describe('The type of object the custom field applies to.'),
        label: z.string().describe('The display label for the custom field.'),
        description: z.string().optional().describe('The description of the custom field.'),
        priority: z.number().optional().describe('The display priority of the custom field.'),
        required: z.boolean().optional().describe('Whether the custom field is required.'),
        definition: z
            .object({
                data_type: z.string().optional().describe('The data type of the custom field.'),
                input_settings: z
                    .object({
                        input_type: z.string().nullable().optional().describe('The input widget type for the custom field.')
                    })
                    .passthrough()
                    .optional()
                    .describe(
                        'Settings that control how the field is rendered in the UI, including any field-specific settings such as `choices`, `default`, `min`, or `max`.'
                    )
            })
            .optional()
            .describe('The type definition and UI settings for the custom field.'),
        created_datetime: z.string().optional().describe('The ISO 8601 timestamp when the custom field was created.'),
        updated_datetime: z.string().optional().describe('The ISO 8601 timestamp when the custom field was last updated.')
    })
    .describe('The created custom field definition returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Creates a new custom field definition on the Gorgias account.
 * @pitfalls: The `input_type` for text fields must be `"input"` rather than `"text_field"` (which 400s). Labels must be unique across the account; duplicate labels return a 400. The server may override the provided priority value. Created custom fields cannot be deleted via the API, only deactivated.
 */
const action = createAction({
    description: 'Create a custom field definition for tickets or customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['custom_fields:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-custom-field
            endpoint: '/api/custom-fields',
            data: {
                object_type: input.object_type,
                label: input.label,
                description: input.description,
                priority: input.priority,
                required: input.required,
                definition: input.definition
            },
            retries: 10
        });

        const providerField = ProviderCustomFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            object_type: providerField.object_type,
            label: providerField.label,
            ...(providerField.description != null && { description: providerField.description }),
            ...(providerField.priority != null && { priority: providerField.priority }),
            ...(providerField.required != null && { required: providerField.required }),
            ...(providerField.definition != null && {
                definition: {
                    ...(providerField.definition.data_type != null && { data_type: providerField.definition.data_type }),
                    ...(providerField.definition.input_settings != null && {
                        input_settings: providerField.definition.input_settings
                    })
                }
            }),
            ...(providerField.created_datetime != null && { created_datetime: providerField.created_datetime }),
            ...(providerField.updated_datetime != null && { updated_datetime: providerField.updated_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
