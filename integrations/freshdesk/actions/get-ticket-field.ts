import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the ticket field to retrieve. Example: 22')
    })
    .describe('Input parameters for retrieving a single Freshdesk ticket field.');

const SectionSchema = z
    .object({
        id: z.number().describe('Unique ID of the section.'),
        label: z.string().describe('Display label of the section.'),
        parent_ticket_field_id: z.number().describe('ID of the parent ticket field that owns this section.'),
        choice_ids: z.array(z.number()).describe('IDs of choices associated with this section.'),
        ticket_field_ids: z.array(z.number()).describe('IDs of ticket fields included in this section.')
    })
    .passthrough();

const SectionMappingSchema = z
    .object({
        section_id: z.number().describe('ID of the section the field belongs to.'),
        position: z.number().describe('Position of the field within the section.')
    })
    .passthrough();

const NestedChoiceSchema = z
    .object({
        id: z.number().nullish().describe('Unique ID of the nested choice.'),
        position: z.number().nullish().describe('Display position of the nested choice in the dropdown.'),
        value: z.union([z.string(), z.number()]).describe('Display value of the nested choice.')
    })
    .passthrough();

const ChoiceSchema = z
    .object({
        // Built-in fields (e.g. Type, Source, Priority) omit id/position or return a numeric
        // value instead of the custom-dropdown shape of {id, label, value, position}.
        id: z.number().nullish().describe('Unique ID of the choice.'),
        position: z.number().nullish().describe('Display position of the choice in the dropdown.'),
        value: z.union([z.string(), z.number()]).describe('Display value of the choice.'),
        parent_choice_id: z.number().nullish().describe('ID of the parent choice for nested dropdowns.'),
        choices: z.array(NestedChoiceSchema).nullish().describe('Nested child choices for multi-level dropdowns.')
    })
    .passthrough();

const DependentFieldSchema = z
    .object({
        id: z.number().describe('Unique ID of the dependent nested field.'),
        name: z.string().describe('System name of the dependent field.'),
        label: z.string().describe('Display label of the dependent field.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the ticket field.'),
        name: z.string().describe('System name of the ticket field.'),
        label: z.string().describe('Display name for the field as seen by agents.'),
        label_for_customers: z.string().nullish().describe('Display name for the field as seen in the customer portal.'),
        position: z.number().describe('Position in which the ticket field is displayed in the form.'),
        type: z
            .string()
            .nullish()
            .describe('For custom fields, the type of value associated with the field (e.g., custom_date, custom_text, custom_dropdown).'),
        default: z.boolean().describe('Set to true if the field is a system default field rather than a custom field.'),
        customers_can_edit: z.boolean().nullish().describe('Set to true if the field can be updated by customers.'),
        required_for_closure: z.boolean().nullish().describe('Set to true if the field is mandatory for closing the ticket.'),
        required_for_agents: z.boolean().nullish().describe('Set to true if the field is mandatory for agents.'),
        required_for_customers: z.boolean().nullish().describe('Set to true if the field is mandatory in the customer portal.'),
        displayed_to_customers: z.boolean().nullish().describe('Set to true if the field is displayed in the customer portal.'),
        description: z.string().nullish().describe('Description of the ticket field.'),
        portal_cc: z
            .boolean()
            .nullish()
            .describe('Applicable only for the requester field. Set to true if the customer can add additional requesters to a ticket.'),
        portal_cc_to: z
            .string()
            .nullish()
            .describe('Applicable if portal_cc is true. Value is all when any requester can be added and company when only company contacts can be added.'),
        choices: z.array(ChoiceSchema).nullish().describe('List of values supported by dropdown or nested fields.'),
        is_fsm: z.boolean().nullish().describe('True if the ticket field is inside the FSM section (applicable only if FSM is enabled).'),
        field_update_in_progress: z.boolean().nullish().describe('True if the choice update is in progress (applicable for fields with 100+ choices).'),
        dependent_fields: z.array(DependentFieldSchema).nullish().describe('Details of nested dependent fields.'),
        section_mappings: z.array(SectionMappingSchema).nullish().describe('Section membership and position details when the field belongs to a section.'),
        has_section: z.boolean().nullish().describe('Set to true if the field has sections configured.'),
        sections: z.array(SectionSchema).nullish().describe('Section definitions associated with this field.'),
        customers_can_filter: z.boolean().nullish().describe('Set to true if customers can filter by this field in the portal.'),
        archived: z.boolean().nullish().describe('Set to true if the field has been archived.'),
        created_at: z.string().nullish().describe('Timestamp when the ticket field was created, in UTC ISO 8601 format.'),
        updated_at: z.string().nullish().describe('Timestamp when the ticket field was last updated, in UTC ISO 8601 format.')
    })
    .passthrough()
    .describe('A single Freshdesk ticket field with its configuration, choices, sections, and mappings.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single ticket field from Freshdesk via a GET request.
 * @pitfalls: Freshdesk may add new response attributes without advance notice, and the presence of optional arrays depends on the field type and configuration.
 */
const action = createAction({
    description: 'Retrieve a single ticket field from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_ticket_field
            endpoint: `/api/v2/admin/ticket_fields/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket field not found',
                id: input.id
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
