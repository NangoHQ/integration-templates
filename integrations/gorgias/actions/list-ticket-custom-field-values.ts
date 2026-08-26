import { createAction } from 'nango';
import { z } from 'zod';

const OutputSchema = z
    .object({
        data: z
            .array(
                z
                    .object({
                        field: z
                            .object({
                                id: z.number().int().optional().describe('The unique identifier of the custom field definition.'),
                                label: z.string().optional().describe('The display name of the custom field.'),
                                object_type: z.string().optional().describe('The object type this custom field applies to (e.g., Ticket or Customer).'),
                                created_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was created.'),
                                updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was last updated.'),
                                deactivated_datetime: z
                                    .string()
                                    .nullable()
                                    .optional()
                                    .describe('ISO 8601 timestamp when the custom field was deactivated, if applicable.'),
                                managed_type: z.string().nullable().optional().describe('The managed type for system-controlled fields, if any.'),
                                external_id: z.string().nullable().optional().describe('External identifier of the custom field, if any.'),
                                description: z.string().optional().describe('Description of the custom field.'),
                                priority: z.number().int().optional().describe('Priority order of the custom field.'),
                                required: z.boolean().optional().describe('Whether this custom field is required.'),
                                requirement_type: z.string().optional().describe('Visibility requirement type of the custom field.'),
                                definition: z
                                    .object({
                                        data_type: z.string().optional().describe('The data type of the custom field.'),
                                        input_settings: z
                                            .object({
                                                input_type: z.string().optional().describe('The input type for rendering the custom field.')
                                            })
                                            .passthrough()
                                            .optional()
                                            .describe('Settings that control how the custom field is rendered.')
                                    })
                                    .passthrough()
                                    .optional()
                                    .describe('The definition schema and type information of the custom field.')
                            })
                            .passthrough()
                            .describe('The custom field definition this value belongs to.'),
                        value: z.unknown().describe('The value set for this custom field on the ticket.')
                    })
                    .passthrough()
                    .describe('A custom field value entry for the ticket.')
            )
            .describe('List of custom field values set on the ticket.')
    })
    .describe('Response containing the list of custom field values for the ticket.');

/**
 * @tags: [read]
 * @tagReason: Reads the custom field values set on a ticket from the Gorgias API.
 * @pitfalls: Deactivated custom fields are still included in the response; check `field.deactivated_datetime` to filter them out if needed.
 */
const action = createAction({
    description: 'List all custom field values set on a ticket.',
    input: z
        .object({
            ticket_id: z.number().int().describe('The unique identifier of the ticket to list custom field values for.')
        })
        .describe('Input for listing custom field values on a ticket.'),
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/list-ticket-custom-fields
        const response = await nango.get({
            endpoint: `api/tickets/${encodeURIComponent(input.ticket_id)}/custom-fields`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export default action;
