import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldValueInputSchema = z.object({
    id: z.number().describe('ID of the custom field definition to set. Example: 319825'),
    value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to assign to the custom field')
});

const InputSchema = z
    .object({
        ticket_id: z.number().describe('ID of the ticket to update. Example: 82682724'),
        custom_fields: z.array(CustomFieldValueInputSchema).describe('Array of custom field values to set on the ticket')
    })
    .describe('Input for updating multiple ticket custom field values in a single call');

const FieldDefinitionSchema = z
    .object({
        id: z.number().describe('ID of the custom field definition'),
        external_id: z.string().nullable().describe('External ID of the custom field'),
        object_type: z.string().describe('Object type this custom field applies to'),
        label: z.string().describe('Display label of the custom field'),
        description: z.string().nullable().describe('Description of the custom field'),
        priority: z.number().describe('Display priority of the custom field'),
        required: z.boolean().describe('Whether the custom field is required'),
        requirement_type: z.string().describe('Requirement type of the custom field'),
        managed_type: z.string().nullable().describe('Managed type if this is a system-managed field'),
        definition: z
            .object({
                data_type: z.string().describe('Data type of the custom field'),
                input_settings: z
                    .object({
                        input_type: z.string().describe('Input widget type for the custom field'),
                        choices: z.array(z.union([z.string(), z.boolean()])).optional().describe('Available choices for dropdown fields')
                    })
                    .optional()
                    .describe('Input rendering settings for the custom field')
            })
            .passthrough()
            .describe('Field definition metadata'),
        created_datetime: z.string().describe('When the custom field was created'),
        updated_datetime: z.string().describe('When the custom field was last updated'),
        deactivated_datetime: z.string().nullable().describe('When the custom field was deactivated')
    })
    .passthrough();

const CustomFieldValueOutputSchema = z.object({
    field: FieldDefinitionSchema.describe('The custom field definition'),
    prediction: z.string().nullable().describe('Predicted value for AI-managed fields'),
    value: z.union([z.string(), z.number(), z.boolean()]).describe('The value set for this custom field')
});

const OutputSchema = z
    .object({
        data: z.array(CustomFieldValueOutputSchema).describe('Array of custom field values set on the ticket')
    })
    .describe('Response containing the updated custom field values on the ticket');

/**
 * @tags: [write, destructive]
 * @tagReason: PUT replaces all custom field values on the ticket; omitting existing fields effectively deletes them.
 * @pitfalls: This endpoint fully replaces all custom field values on the ticket, not a merge. Omitting an existing field removes it, and omitting a system-managed field causes a 400 because the API treats the omission as a deletion attempt.
 */
const action = createAction({
    description: 'Set multiple custom field values on a ticket in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write', 'custom_fields:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.gorgias.com/reference/put-api-tickets-ticket-id-custom-fields
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/custom-fields`,
            data: input.custom_fields,
            retries: 3
        });

        const result = OutputSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Gorgias API',
                details: result.error.issues
            });
        }

        return result.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
