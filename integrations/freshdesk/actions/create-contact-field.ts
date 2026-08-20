import { z } from 'zod';
import { createAction } from 'nango';

const ChoiceInputSchema = z.object({
    value: z.string().describe('Display value of the dropdown choice.'),
    position: z.number().describe('Position of the choice in the dropdown list.')
});

const InputSchema = z
    .object({
        label: z.string().describe('Display name for the field as seen by agents.'),
        label_for_customers: z.string().describe('Display name for the field as seen in the customer portal.'),
        type: z
            .string()
            .describe(
                'Data type of the custom contact field. Examples: custom_date, custom_text, custom_dropdown, custom_number, custom_checkbox, custom_paragraph, custom_url.'
            ),
        editable_in_signup: z.boolean().optional().describe('Whether the field can be updated by customers during signup. Defaults to false.'),
        position: z
            .number()
            .optional()
            .describe('Position of the contact field in the form. Defaults to 1 if omitted. Maximum is number of existing fields plus 1.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents. Defaults to false.'),
        agents_can_edit: z
            .boolean()
            .optional()
            .describe('Whether agents can edit the field in the agent interface. Defaults to true. Only available for accounts from June 2022 or later.'),
        displayed_for_agents: z
            .boolean()
            .optional()
            .describe('Whether agents can view the field in the agent interface. Defaults to true. Only available for accounts from June 2022 or later.'),
        quick_add_for_agent: z
            .boolean()
            .optional()
            .describe('Whether the field appears under Quick-add in the contact form. Defaults to false. Only available for accounts from June 2022 or later.'),
        unique: z
            .boolean()
            .optional()
            .describe(
                'Whether the field prevents duplicate contact creation. Defaults to false. Can only be toggled for custom_text, Mobile phone, and Work phone fields.'
            ),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit the field in the customer portal. Defaults to false.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory in the customer portal. Defaults to false.'),
        displayed_for_customers: z.boolean().optional().describe('Whether customers can see the field in the customer portal. Defaults to false.'),
        choices: z.array(ChoiceInputSchema).optional().describe('Dropdown choices. Required when type is custom_dropdown.')
    })
    .describe('Input to create a custom contact field in Freshdesk.');

const ProviderChoiceSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string(),
    position: z.number()
});

const ProviderContactFieldSchema = z.object({
    id: z.number(),
    name: z.string(),
    label: z.string(),
    label_for_customers: z.string(),
    type: z.string(),
    position: z.number(),
    required_for_agents: z.boolean(),
    agents_can_edit: z.boolean().optional(),
    displayed_for_agents: z.boolean().optional(),
    quick_add_for_agent: z.boolean().optional(),
    unique: z.boolean().optional(),
    editable_in_signup: z.boolean(),
    default: z.boolean(),
    customers_can_edit: z.boolean(),
    required_for_customers: z.boolean(),
    displayed_for_customers: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    choices: z.array(ProviderChoiceSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created contact field.'),
        name: z.string().describe('System-generated name for the contact field.'),
        label: z.string().describe('Display name for the field as seen by agents.'),
        label_for_customers: z.string().describe('Display name for the field as seen in the customer portal.'),
        type: z.string().describe('Data type of the custom contact field.'),
        position: z.number().describe('Position of the contact field in the form.'),
        required_for_agents: z.boolean().describe('Whether the field is mandatory for agents.'),
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit the field in the agent interface.'),
        displayed_for_agents: z.boolean().optional().describe('Whether agents can view the field in the agent interface.'),
        quick_add_for_agent: z.boolean().optional().describe('Whether the field appears under Quick-add in the contact form.'),
        unique: z.boolean().optional().describe('Whether the field prevents duplicate contact creation.'),
        editable_in_signup: z.boolean().describe('Whether the field can be updated by customers during signup.'),
        default: z.boolean().describe('Whether this is a default system field.'),
        customers_can_edit: z.boolean().describe('Whether customers can edit the field in the customer portal.'),
        required_for_customers: z.boolean().describe('Whether the field is mandatory in the customer portal.'),
        displayed_for_customers: z.boolean().describe('Whether customers can see the field in the customer portal.'),
        created_at: z.string().describe('Timestamp when the field was created, in UTC ISO 8601 format.'),
        updated_at: z.string().describe('Timestamp when the field was last updated, in UTC ISO 8601 format.'),
        choices: z
            .array(
                z.object({
                    id: z.number().describe('Unique identifier of the dropdown choice.'),
                    label: z.string().describe('Display label of the choice.'),
                    value: z.string().describe('Display value of the choice.'),
                    position: z.number().describe('Position of the choice in the dropdown list.')
                })
            )
            .optional()
            .describe('Dropdown choices when the field type is custom_dropdown.')
    })
    .describe('Output representing a created contact field in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new custom contact field in Freshdesk.
 * @pitfalls: Freshdesk derives the system `name` from the caller's `label` and returns a 409 conflict if that derived name already exists, even though `name` is not an input parameter. The response omits `agents_can_edit`, `displayed_for_agents`, `quick_add_for_agent`, and `unique` on pre-June 2022 accounts, and `unique` can only be enabled for `custom_text`, Mobile phone, or Work phone fields.
 */
const action = createAction({
    description: 'Create a contact field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_contact_field
            endpoint: '/api/v2/contact_fields',
            data: {
                label: input.label,
                label_for_customers: input.label_for_customers,
                type: input.type,
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

        const providerField = ProviderContactFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            label: providerField.label,
            label_for_customers: providerField.label_for_customers,
            type: providerField.type,
            position: providerField.position,
            required_for_agents: providerField.required_for_agents,
            ...(providerField.agents_can_edit !== undefined && { agents_can_edit: providerField.agents_can_edit }),
            ...(providerField.displayed_for_agents !== undefined && { displayed_for_agents: providerField.displayed_for_agents }),
            ...(providerField.quick_add_for_agent !== undefined && { quick_add_for_agent: providerField.quick_add_for_agent }),
            ...(providerField.unique !== undefined && { unique: providerField.unique }),
            editable_in_signup: providerField.editable_in_signup,
            default: providerField.default,
            customers_can_edit: providerField.customers_can_edit,
            required_for_customers: providerField.required_for_customers,
            displayed_for_customers: providerField.displayed_for_customers,
            created_at: providerField.created_at,
            updated_at: providerField.updated_at,
            ...(providerField.choices !== undefined && { choices: providerField.choices })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
