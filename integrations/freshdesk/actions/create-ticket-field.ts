import { z } from 'zod';
import { createAction } from 'nango';

const InputChoiceSchema = z
    .object({
        value: z.string().describe('Display value of the choice.'),
        position: z.number().optional().describe('Position of the choice in the list.'),
        choices: z.array(z.unknown()).optional().describe('Nested sub-choices for dependent fields.')
    })
    .passthrough();

const InputDependentFieldSchema = z
    .object({
        label: z.string().describe('Label of the dependent field.'),
        label_for_customers: z.string().optional().describe('Customer-facing label of the dependent field.'),
        level: z.number().describe('Nesting level of the dependent field.')
    })
    .passthrough();

const InputSectionMappingSchema = z
    .object({
        section_id: z.number().describe('ID of the section the field belongs to.'),
        position: z.number().optional().describe('Position of the field within the section.')
    })
    .passthrough();

const InputSchema = z
    .object({
        label: z.string().describe('Display name of the ticket field.'),
        type: z.string().describe('Ticket field type. Examples: custom_dropdown, custom_checkbox, custom_text, nested_field.'),
        customers_can_edit: z.boolean().optional().describe('Whether the customer can edit the ticket field.'),
        label_for_customers: z.string().describe('Ticket field name displayed to customers.'),
        displayed_to_customers: z.boolean().optional().describe('Whether the ticket field is displayed to customers.'),
        position: z.number().optional().describe('Position in the form. Defaults to top if omitted.'),
        required_for_closure: z.boolean().optional().describe('Whether the field is mandatory for closing a ticket.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory in the customer portal.'),
        choices: z.array(InputChoiceSchema).optional().describe('Dropdown choices. Required for custom_dropdown and nested_field types.'),
        dependent_fields: z.array(InputDependentFieldSchema).optional().describe('Dependent field definitions. Applicable only for nested_field types.'),
        section_mappings: z.array(InputSectionMappingSchema).optional().describe('Section mappings. Applicable only when the field is part of a section.')
    })
    .describe('Input to create a Freshdesk ticket field.');

const OutputChoiceSchema = z.object({
    id: z.number().describe('ID of the choice.'),
    position: z.number().describe('Position of the choice.'),
    value: z.string().describe('Display value of the choice.'),
    parent_choice_id: z.number().nullable().optional().describe('ID of the parent choice.'),
    choices: z.array(z.unknown()).nullable().optional().describe('Nested sub-choices.')
});

const OutputSectionSchema = z
    .object({
        id: z.number().describe('ID of the section.'),
        label: z.string().describe('Label of the section.'),
        parent_ticket_field_id: z.number().optional().describe('ID of the parent ticket field.'),
        choice_ids: z.array(z.number()).optional().describe('IDs of associated choices.'),
        ticket_field_ids: z.array(z.number()).optional().describe('IDs of associated ticket fields.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created ticket field.'),
        name: z.string().optional().describe('System name of the ticket field.'),
        label: z.string().describe('Display name of the ticket field.'),
        label_for_customers: z.string().optional().describe('Customer-facing label.'),
        position: z.number().optional().describe('Position in the form.'),
        type: z.string().describe('Type of the ticket field.'),
        default: z.boolean().optional().describe('Whether this is the default field.'),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit this field.'),
        required_for_closure: z.boolean().optional().describe('Whether the field is required to close a ticket.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is required for agents.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is required in the customer portal.'),
        displayed_to_customers: z.boolean().optional().describe('Whether the field is displayed to customers.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('Last updated timestamp in ISO 8601 format.'),
        has_section: z.boolean().optional().describe('Whether the field belongs to a section.'),
        sections: z.array(OutputSectionSchema).optional().describe('Section details if applicable.'),
        section_mappings: z.array(InputSectionMappingSchema).optional().describe('Section mappings for the field.'),
        choices: z.array(OutputChoiceSchema).optional().describe('Choices for dropdown or nested fields.')
    })
    .describe('The created Freshdesk ticket field.');

const WrappedResponseSchema = z.object({
    ticket_field: OutputSchema
});

const ProviderResponseSchema = z.union([OutputSchema, WrappedResponseSchema]);

/**
 * @tags: [write]
 * @tagReason: Creates a new ticket field in Freshdesk.
 * @pitfalls: The live API requires label_for_customers even though docs list it as optional, and the provider auto-generates the returned name field.
 */
const action = createAction({
    description: 'Create a ticket field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_ticket_field
            endpoint: '/api/v2/admin/ticket_fields',
            data: {
                label: input.label,
                type: input.type,
                ...(input.customers_can_edit !== undefined && { customers_can_edit: input.customers_can_edit }),
                ...(input.label_for_customers !== undefined && { label_for_customers: input.label_for_customers }),
                ...(input.displayed_to_customers !== undefined && { displayed_to_customers: input.displayed_to_customers }),
                ...(input.position !== undefined && { position: input.position }),
                ...(input.required_for_closure !== undefined && { required_for_closure: input.required_for_closure }),
                ...(input.required_for_agents !== undefined && { required_for_agents: input.required_for_agents }),
                ...(input.required_for_customers !== undefined && { required_for_customers: input.required_for_customers }),
                ...(input.choices !== undefined && { choices: input.choices }),
                ...(input.dependent_fields !== undefined && { dependent_fields: input.dependent_fields }),
                ...(input.section_mappings !== undefined && { section_mappings: input.section_mappings })
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const field = 'ticket_field' in parsed ? parsed.ticket_field : parsed;

        return {
            id: field.id,
            ...(field.name != null && { name: field.name }),
            label: field.label,
            ...(field.label_for_customers != null && { label_for_customers: field.label_for_customers }),
            ...(field.position != null && { position: field.position }),
            type: field.type,
            ...(field.default != null && { default: field.default }),
            ...(field.customers_can_edit != null && { customers_can_edit: field.customers_can_edit }),
            ...(field.required_for_closure != null && { required_for_closure: field.required_for_closure }),
            ...(field.required_for_agents != null && { required_for_agents: field.required_for_agents }),
            ...(field.required_for_customers != null && { required_for_customers: field.required_for_customers }),
            ...(field.displayed_to_customers != null && { displayed_to_customers: field.displayed_to_customers }),
            ...(field.created_at != null && { created_at: field.created_at }),
            ...(field.updated_at != null && { updated_at: field.updated_at }),
            ...(field.has_section != null && { has_section: field.has_section }),
            ...(field.sections != null && { sections: field.sections }),
            ...(field.section_mappings != null && { section_mappings: field.section_mappings }),
            ...(field.choices != null && { choices: field.choices })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
