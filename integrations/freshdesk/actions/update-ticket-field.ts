import { z } from 'zod';
import { createAction } from 'nango';

const InputChoiceSchema = z.object({
    id: z.number().optional().describe('Choice ID. Omit when creating a new choice.'),
    position: z.number().optional().describe('Position/order of the choice in the dropdown.'),
    value: z.string().optional().describe('Display label or value of the choice.'),
    deleted: z.boolean().optional().describe('Set to true to remove an existing choice.')
});

const InputSchema = z
    .object({
        id: z.number().describe('Ticket field ID to update. Example: 22'),
        label: z.string().optional().describe('Display name of the ticket field.'),
        label_for_customers: z.string().optional().describe('Ticket field name shown to customers.'),
        displayed_to_customers: z.boolean().optional().describe('Whether the field is visible to customers.'),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit the field.'),
        position: z.number().optional().describe('Position of the field in the form.'),
        required_for_closure: z.boolean().optional().describe('Whether the field is mandatory for closing a ticket.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory in the customer portal.'),
        type: z.string().optional().describe('Ticket field type, e.g. custom_dropdown or custom_text.'),
        choices: z.array(InputChoiceSchema).optional().describe('Dropdown choices. Must include all existing choices or they will be removed.'),
        dependent_fields: z.array(z.record(z.string(), z.unknown())).optional().describe('Nested dependent field details.'),
        section_mappings: z.array(z.record(z.string(), z.unknown())).optional().describe('Section mapping details when the field belongs to a section.')
    })
    .describe('Input to update an existing Freshdesk ticket field.');

const OutputChoiceSchema = z.object({
    id: z.number().optional().describe('Choice ID.'),
    position: z.number().optional().describe('Choice position/order.'),
    value: z.string().optional().describe('Choice label/value.'),
    parent_choice_id: z.number().optional().describe('Parent choice ID for nested choices.'),
    choices: z.array(z.record(z.string(), z.unknown())).optional().describe('Nested choices.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the ticket field.'),
        name: z.string().describe('Internal name of the ticket field.'),
        label: z.string().optional().describe('Display name of the ticket field.'),
        label_for_customers: z.string().optional().describe('Ticket field name shown to customers.'),
        position: z.number().optional().describe('Position of the field in the form.'),
        type: z.string().optional().describe('Ticket field type.'),
        default: z.boolean().optional().describe('Whether this is a default system field.'),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit the field.'),
        required_for_closure: z.boolean().optional().describe('Whether the field is mandatory for closing a ticket.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory in the customer portal.'),
        displayed_to_customers: z.boolean().optional().describe('Whether the field is visible to customers.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the field was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the field was last updated.'),
        choices: z.array(OutputChoiceSchema).optional().describe('Dropdown choices configured for the field.')
    })
    .describe('The updated Freshdesk ticket field.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing ticket field's configuration via PUT.
 * @pitfalls: Omitting an existing choice when updating choices deletes it and resets that value to null on all tickets using it. Default system fields have read-only attributes that cannot be altered.
 */
const action = createAction({
    description: 'Update a ticket field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input) => {
        const data: Record<string, unknown> = {};
        if (input.label !== undefined) data['label'] = input.label;
        if (input.label_for_customers !== undefined) data['label_for_customers'] = input.label_for_customers;
        if (input.displayed_to_customers !== undefined) data['displayed_to_customers'] = input.displayed_to_customers;
        if (input.customers_can_edit !== undefined) data['customers_can_edit'] = input.customers_can_edit;
        if (input.position !== undefined) data['position'] = input.position;
        if (input.required_for_closure !== undefined) data['required_for_closure'] = input.required_for_closure;
        if (input.required_for_agents !== undefined) data['required_for_agents'] = input.required_for_agents;
        if (input.required_for_customers !== undefined) data['required_for_customers'] = input.required_for_customers;
        if (input.type !== undefined) data['type'] = input.type;
        if (input.choices !== undefined) data['choices'] = input.choices;
        if (input.dependent_fields !== undefined) data['dependent_fields'] = input.dependent_fields;
        if (input.section_mappings !== undefined) data['section_mappings'] = input.section_mappings;

        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_ticket_field
            endpoint: `/api/v2/admin/ticket_fields/${encodeURIComponent(input.id)}`,
            data,
            retries: 1
        });

        const ProviderTicketFieldSchema = z.object({
            id: z.number(),
            name: z.string(),
            label: z.string().optional(),
            label_for_customers: z.string().optional(),
            position: z.number().optional(),
            type: z.string().optional(),
            default: z.boolean().optional(),
            customers_can_edit: z.boolean().optional(),
            required_for_closure: z.boolean().optional(),
            required_for_agents: z.boolean().optional(),
            required_for_customers: z.boolean().optional(),
            displayed_to_customers: z.boolean().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional(),
            choices: z
                .array(
                    z.object({
                        id: z.number().optional(),
                        position: z.number().optional(),
                        value: z.string().optional(),
                        parent_choice_id: z.number().optional(),
                        choices: z.array(z.record(z.string(), z.unknown())).optional()
                    })
                )
                .optional()
        });

        const parsed = ProviderTicketFieldSchema.parse(response.data);

        return {
            id: parsed.id,
            name: parsed.name,
            ...(parsed.label !== undefined && { label: parsed.label }),
            ...(parsed.label_for_customers !== undefined && { label_for_customers: parsed.label_for_customers }),
            ...(parsed.position !== undefined && { position: parsed.position }),
            ...(parsed.type !== undefined && { type: parsed.type }),
            ...(parsed.default !== undefined && { default: parsed.default }),
            ...(parsed.customers_can_edit !== undefined && { customers_can_edit: parsed.customers_can_edit }),
            ...(parsed.required_for_closure !== undefined && { required_for_closure: parsed.required_for_closure }),
            ...(parsed.required_for_agents !== undefined && { required_for_agents: parsed.required_for_agents }),
            ...(parsed.required_for_customers !== undefined && { required_for_customers: parsed.required_for_customers }),
            ...(parsed.displayed_to_customers !== undefined && { displayed_to_customers: parsed.displayed_to_customers }),
            ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
            ...(parsed.updated_at !== undefined && { updated_at: parsed.updated_at }),
            ...(parsed.choices !== undefined && { choices: parsed.choices })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
