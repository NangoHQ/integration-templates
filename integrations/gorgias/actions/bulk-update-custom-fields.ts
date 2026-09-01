import { z } from 'zod';
import { createAction } from 'nango';

// --- Input schemas ---

const CustomFieldUpdateItemSchema = z
    .object({
        id: z.number().describe('The unique identifier of the custom field to update.'),
        external_id: z.string().optional().describe('ID of the custom field in a foreign system (e.g., Zendesk).'),
        object_type: z.enum(['Ticket', 'Customer']).optional().describe('Type of entity on which to use this custom field.'),
        label: z.string().optional().describe('The display name of the custom field.'),
        description: z.string().optional().describe('The description of the custom field.'),
        priority: z.number().optional().describe('Order in which custom fields are displayed. Lower values appear first.'),
        required: z.boolean().optional().describe('Whether this custom field is required.'),
        requirement_type: z.enum(['visible', 'required', 'conditional']).optional().describe('The requirement type of the custom field.'),
        managed_type: z.string().optional().describe('The type of the managed field, if this is a system-managed field.'),
        definition: z
            .object({
                data_type: z.enum(['text', 'number', 'boolean']).describe('The data type of the custom field definition.'),
                input_settings: z
                    .object({
                        input_type: z.enum(['input', 'dropdown', 'input_number']).describe('The input type for this custom field.'),
                        placeholder: z.string().optional().describe('A hint to show within the input field when no data is entered.'),
                        choices: z
                            .union([z.array(z.string()), z.array(z.boolean())])
                            .optional()
                            .describe('The available choices for dropdown input.'),
                        default: z.union([z.string(), z.boolean()]).optional().describe('The default value for this field.'),
                        min: z.union([z.number(), z.string()]).optional().describe('Minimum allowed number as value.'),
                        max: z.union([z.number(), z.string()]).optional().describe('Maximum allowed number as value.')
                    })
                    .describe('Input settings for this custom field data type.')
            })
            .optional()
            .describe('The data type definition for this custom field.'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 timestamp to deactivate the custom field. Omit to keep active.')
    })
    .describe('A single custom field definition to update.');

const InputSchema = z
    .object({
        fields: z.array(CustomFieldUpdateItemSchema).describe('Array of custom field definitions to update in bulk.')
    })
    .describe('Input for bulk updating custom field definitions.');

// --- Provider response schemas (internal, no descriptions required) ---

const ProviderDefinitionSchema = z.union([
    z.object({
        data_type: z.literal('text'),
        input_settings: z.union([
            z.object({
                input_type: z.literal('input'),
                placeholder: z.string().optional()
            }),
            z.object({
                input_type: z.literal('dropdown'),
                choices: z.array(z.string()).optional(),
                default: z.string().optional()
            })
        ])
    }),
    z.object({
        data_type: z.literal('number'),
        input_settings: z.object({
            input_type: z.literal('input_number'),
            placeholder: z.string().optional(),
            min: z.union([z.number(), z.string()]).optional(),
            max: z.union([z.number(), z.string()]).optional()
        })
    }),
    z.object({
        data_type: z.literal('boolean'),
        input_settings: z.object({
            input_type: z.literal('dropdown'),
            choices: z.array(z.boolean()).optional(),
            default: z.boolean().optional()
        })
    })
]);

const ProviderCustomFieldSchema = z.object({
    id: z.number(),
    external_id: z.string().nullable(),
    object_type: z.enum(['Ticket', 'Customer']),
    label: z.string(),
    description: z.string().nullable(),
    priority: z.number(),
    required: z.boolean(),
    managed_type: z.string().nullable(),
    definition: ProviderDefinitionSchema,
    created_datetime: z.string(),
    updated_datetime: z.string(),
    deactivated_datetime: z.string().nullable()
});

// --- Output schemas ---

const DefinitionSchema = z
    .union([
        z
            .object({
                data_type: z.literal('text').describe('The data type of the custom field definition.'),
                input_settings: z
                    .union([
                        z
                            .object({
                                input_type: z.literal('input').describe('The input type for text fields.'),
                                placeholder: z.string().optional().describe('A hint to show within the input field when no data is entered.')
                            })
                            .describe('Text input settings.'),
                        z
                            .object({
                                input_type: z.literal('dropdown').describe('The input type for dropdown fields.'),
                                choices: z.array(z.string()).optional().describe('The available choices to show in the dropdown.'),
                                default: z.string().optional().describe('The default value for this dropdown.')
                            })
                            .describe('Dropdown input settings.')
                    ])
                    .describe('Input settings for text custom fields.')
            })
            .describe('Text custom field definition.'),
        z
            .object({
                data_type: z.literal('number').describe('The data type of the custom field definition.'),
                input_settings: z
                    .object({
                        input_type: z.literal('input_number').describe('The input type for number fields.'),
                        placeholder: z.string().optional().describe('A hint to show within the input field when no data is entered.'),
                        min: z.union([z.number(), z.string()]).optional().describe('Minimum allowed number as value.'),
                        max: z.union([z.number(), z.string()]).optional().describe('Maximum allowed number as value.')
                    })
                    .describe('Input settings for number custom fields.')
            })
            .describe('Number custom field definition.'),
        z
            .object({
                data_type: z.literal('boolean').describe('The data type of the custom field definition.'),
                input_settings: z
                    .object({
                        input_type: z.literal('dropdown').describe('The input type for boolean dropdown fields.'),
                        choices: z.array(z.boolean()).optional().describe('The boolean choices to show as a dropdown.'),
                        default: z.boolean().optional().describe('The default value.')
                    })
                    .describe('Input settings for boolean custom fields.')
            })
            .describe('Boolean custom field definition.')
    ])
    .describe('The data type definition for this custom field.');

const CustomFieldSchema = z
    .object({
        id: z.number().describe('The unique identifier of the custom field.'),
        external_id: z.string().optional().describe('ID of the custom field in a foreign system (e.g., Zendesk).'),
        object_type: z.enum(['Ticket', 'Customer']).describe('Type of entity on which this custom field is used.'),
        label: z.string().describe('The display name of the custom field.'),
        description: z.string().optional().describe('The description of the custom field.'),
        priority: z.number().describe('Order in which custom fields are displayed. Lower values appear first.'),
        required: z.boolean().describe('Whether this custom field is required.'),
        managed_type: z.string().optional().describe('The type of the managed field, if this is a system-managed field.'),
        definition: DefinitionSchema.describe('The data type definition for this custom field.'),
        created_datetime: z.string().describe('When the custom field was created.'),
        updated_datetime: z.string().describe('When the custom field was last updated.'),
        deactivated_datetime: z.string().optional().describe('When the custom field was deactivated, if applicable.')
    })
    .describe('A custom field definition.');

const OutputSchema = z
    .object({
        fields: z.array(CustomFieldSchema).describe('The updated custom field definitions.')
    })
    .describe('Output for bulk updating custom field definitions.');

/**
 * @tags: [write]
 * @tagReason: Updates multiple custom field definitions in a single provider call.
 * @pitfalls: Custom field definitions cannot be hard-deleted through this API; the only way to remove one is to set its deactivated_datetime to an ISO 8601 timestamp.
 */
const action = createAction({
    description: 'Bulk update custom field definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['custom_fields:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-custom-fields
            endpoint: '/api/custom-fields',
            data: input.fields,
            retries: 3
        });

        const providerFields = z.array(ProviderCustomFieldSchema).parse(response.data.data);

        return {
            fields: providerFields.map((field) => ({
                id: field.id,
                ...(field.external_id != null && { external_id: field.external_id }),
                object_type: field.object_type,
                label: field.label,
                ...(field.description != null && { description: field.description }),
                priority: field.priority,
                required: field.required,
                ...(field.managed_type != null && { managed_type: field.managed_type }),
                definition: field.definition,
                created_datetime: field.created_datetime,
                updated_datetime: field.updated_datetime,
                ...(field.deactivated_datetime != null && { deactivated_datetime: field.deactivated_datetime })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
