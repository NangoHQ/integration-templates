import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to update.'),
        custom_field_id: z.number().describe('The ID of the custom field to set.'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('The new value for the custom field.')
    })
    .describe('Input for updating a ticket custom field value.');

const OutputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket that was updated.'),
        custom_field_id: z.number().describe('The ID of the custom field that was set.'),
        value: z.union([z.string(), z.number(), z.boolean()]).optional().describe('The updated custom field value.')
    })
    .describe('Output for updating a ticket custom field value.');

const ProviderTicketCustomFieldValueSchema = z.object({
    field: z
        .object({
            id: z.number().optional()
        })
        .optional(),
    value: z.unknown().optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing ticket to preserve current custom fields before updating the target value.
 * @pitfalls: The action rewrites the ticket's entire custom field set as a read-modify-write cycle; concurrent changes by other systems between read and write may be lost.
 */
const action = createAction({
    description: 'Set a single custom field value on a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write', 'custom_fields:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-ticket
        const ticketResponse = await nango.get({
            endpoint: `/api/tickets/${encodeURIComponent(String(input.ticket_id))}`,
            retries: 3
        });

        const fieldSchema = z.object({
            id: z.number(),
            value: z.unknown().optional()
        });

        const ticketSchema = z.object({
            custom_fields: z.record(z.string(), fieldSchema).optional()
        });

        const ticket = ticketSchema.parse(ticketResponse.data);
        const existingFields = ticket.custom_fields || {};

        const valuesArray = Object.values(existingFields).map((field) => {
            const parsedField = fieldSchema.parse(field);
            return {
                id: parsedField.id,
                value: parsedField.value
            };
        });

        const existingField = valuesArray.find((f) => f.id === input.custom_field_id);
        if (existingField) {
            existingField.value = input.value;
        } else {
            valuesArray.push({ id: input.custom_field_id, value: input.value });
        }

        // https://developers.gorgias.com/reference/update-ticket-custom-fields
        const updateResponse = await nango.put({
            endpoint: `/api/tickets/${encodeURIComponent(String(input.ticket_id))}/custom-fields`,
            data: valuesArray,
            retries: 3
        });

        const responseSchema = z.object({
            data: z.array(ProviderTicketCustomFieldValueSchema).optional()
        });

        const updateResult = responseSchema.parse(updateResponse.data);
        const updatedField = updateResult.data?.find((f) => f.field?.id === input.custom_field_id);
        const parsedValue = z.union([z.string(), z.number(), z.boolean()]).safeParse(updatedField?.value);

        return {
            ticket_id: input.ticket_id,
            custom_field_id: input.custom_field_id,
            ...(parsedValue.success && { value: parsedValue.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
