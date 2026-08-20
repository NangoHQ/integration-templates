import { z } from 'zod';
import { createAction } from 'nango';

const InputChoiceSchema = z.object({
    id: z.number().optional().describe('ID of an existing choice to update. Omit to add a new choice.'),
    value: z.string().optional().describe('Internal value for the choice.'),
    position: z.number().optional().describe('Position of the choice in the dropdown list.'),
    deleted: z.boolean().optional().describe('Set to true to remove an existing choice.')
});

const InputSchema = z
    .object({
        id: z.number().describe('ID of the contact field to update.'),
        label: z.string().optional().describe('Display name for the field as seen by agents.'),
        label_for_customers: z.string().optional().describe('Display name for the field as seen in the customer portal.'),
        editable_in_signup: z.boolean().optional().describe('Set to true if the field can be updated by customers during signup.'),
        position: z.number().optional().describe('Position of the contact field. The maximum value is the number of fields available plus 1.'),
        required_for_agents: z.boolean().optional().describe('Set to true if the field is mandatory for agents.'),
        agents_can_edit: z.boolean().optional().describe('Set to false if agents cannot edit the field in the agent interface.'),
        displayed_for_agents: z.boolean().optional().describe('Set to false if agents cannot view the field in the agent interface.'),
        quick_add_for_agent: z.boolean().optional().describe('Set to true if the field appears under the Quick-add field group in the contact form.'),
        unique: z
            .boolean()
            .optional()
            .describe('Set to true if the contact field enforces unique values. Only applicable to custom_text, Mobile phone, and Work phone fields.'),
        customers_can_edit: z.boolean().optional().describe('Set to true if customers can edit the field in the customer portal.'),
        required_for_customers: z.boolean().optional().describe('Set to true if the field is mandatory in the customer portal.'),
        displayed_for_customers: z.boolean().optional().describe('Set to true if customers can see the field in the customer portal.'),
        choices: z.array(InputChoiceSchema).optional().describe('Array of choice objects for dropdown fields.')
    })
    .describe('Input to update a contact field in Freshdesk.');

const ProviderChoiceSchema = z
    .object({
        id: z.number().optional(),
        label: z.string(),
        value: z.string(),
        position: z.number().optional()
    })
    .passthrough();

const ProviderContactFieldSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        label: z.string(),
        position: z.number(),
        required_for_agents: z.boolean(),
        type: z.string(),
        default: z.boolean(),
        customers_can_edit: z.boolean(),
        label_for_customers: z.string(),
        required_for_customers: z.boolean(),
        displayed_for_customers: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        editable_in_signup: z.boolean().optional(),
        agents_can_edit: z.boolean().optional(),
        displayed_for_agents: z.boolean().optional(),
        quick_add_for_agent: z.boolean().optional(),
        unique: z.boolean().optional(),
        // Custom dropdown fields return an array of choice objects, but built-in fields such as
        // default_time_zone/default_language return a label->value map, and default_social_handler
        // returns a plain string array.
        choices: z.union([z.array(ProviderChoiceSchema), z.array(z.string()), z.record(z.string(), z.string())]).optional()
    })
    .passthrough();

function normalizeChoices(choices: z.infer<typeof ProviderContactFieldSchema>['choices']): z.infer<typeof OutputChoiceSchema>[] | undefined {
    if (choices == null) {
        return undefined;
    }
    if (Array.isArray(choices)) {
        return choices.map((choice, index) =>
            typeof choice === 'string'
                ? { id: index, label: choice, value: choice, position: index }
                : { id: choice.id ?? index, label: choice.label, value: choice.value, position: choice.position ?? index }
        );
    }
    return Object.entries(choices).map(([label, value], index) => ({ id: index, label, value, position: index }));
}

const OutputChoiceSchema = z.object({
    id: z.number().describe('ID of the choice.'),
    label: z.string().describe('Display label of the choice.'),
    value: z.string().describe('Internal value of the choice.'),
    position: z.number().describe('Position of the choice in the list.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the contact field.'),
        name: z.string().describe('System name of the contact field.'),
        label: z.string().describe('Display label of the contact field.'),
        position: z.number().describe('Position of the contact field in the form.'),
        required_for_agents: z.boolean().describe('Whether the field is mandatory for agents.'),
        type: z.string().describe('Field type such as custom_text or custom_dropdown.'),
        default: z.boolean().describe('Whether this is a default system field.'),
        customers_can_edit: z.boolean().describe('Whether customers can edit the field in the portal.'),
        label_for_customers: z.string().describe('Label shown to customers in the portal.'),
        required_for_customers: z.boolean().describe('Whether the field is mandatory for customers.'),
        displayed_for_customers: z.boolean().describe('Whether the field is visible to customers.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format.'),
        editable_in_signup: z.boolean().optional().describe('Whether the field can be updated during signup.'),
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit the field.'),
        displayed_for_agents: z.boolean().optional().describe('Whether the field is visible to agents.'),
        quick_add_for_agent: z.boolean().optional().describe('Whether the field appears in the quick-add group.'),
        unique: z.boolean().optional().describe('Whether the field enforces unique values.'),
        choices: z.array(OutputChoiceSchema).optional().describe('Available choices for dropdown fields.')
    })
    .describe('Updated contact field returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing contact field configuration in Freshdesk.
 * @pitfalls: Admin privileges are required. For dropdown fields, pass existing choice IDs to update, omit IDs to add new choices, and set deleted: true to remove them. agents_can_edit, displayed_for_agents, quick_add_for_agent, and unique are only available on accounts created from June 2022 or upgraded to the latest Contacts and Companies.
 */
const action = createAction({
    description: 'Update a contact field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_contact_field
            endpoint: `/api/v2/contact_fields/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.label !== undefined && { label: input.label }),
                ...(input.label_for_customers !== undefined && { label_for_customers: input.label_for_customers }),
                ...(input.editable_in_signup !== undefined && { editable_in_signup: input.editable_in_signup }),
                ...(input.position !== undefined && { position: input.position }),
                ...(input.required_for_agents !== undefined && { required_for_agents: input.required_for_agents }),
                ...(input.agents_can_edit !== undefined && { agents_can_edit: input.agents_can_edit }),
                ...(input.displayed_for_agents !== undefined && { displayed_for_agents: input.displayed_for_agents }),
                ...(input.quick_add_for_agent !== undefined && { quick_add_for_agent: input.quick_add_for_agent }),
                ...(input.unique !== undefined && { unique: input.unique }),
                ...(input.customers_can_edit !== undefined && { customers_can_edit: input.customers_can_edit }),
                ...(input.required_for_customers !== undefined && { required_for_customers: input.required_for_customers }),
                ...(input.displayed_for_customers !== undefined && { displayed_for_customers: input.displayed_for_customers }),
                ...(input.choices !== undefined && { choices: input.choices })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact field not found or could not be updated.',
                id: input.id
            });
        }

        const providerField = ProviderContactFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            label: providerField.label,
            position: providerField.position,
            required_for_agents: providerField.required_for_agents,
            type: providerField.type,
            default: providerField.default,
            customers_can_edit: providerField.customers_can_edit,
            label_for_customers: providerField.label_for_customers,
            required_for_customers: providerField.required_for_customers,
            displayed_for_customers: providerField.displayed_for_customers,
            created_at: providerField.created_at,
            updated_at: providerField.updated_at,
            ...(providerField.editable_in_signup !== undefined && { editable_in_signup: providerField.editable_in_signup }),
            ...(providerField.agents_can_edit !== undefined && { agents_can_edit: providerField.agents_can_edit }),
            ...(providerField.displayed_for_agents !== undefined && { displayed_for_agents: providerField.displayed_for_agents }),
            ...(providerField.quick_add_for_agent !== undefined && { quick_add_for_agent: providerField.quick_add_for_agent }),
            ...(providerField.unique !== undefined && { unique: providerField.unique }),
            ...(normalizeChoices(providerField.choices) !== undefined && { choices: normalizeChoices(providerField.choices) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
