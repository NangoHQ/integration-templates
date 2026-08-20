import { z } from 'zod';
import { createAction } from 'nango';

const CompanyFieldChoiceInputSchema = z.object({
    value: z.string().describe('Display value of the dropdown choice.'),
    position: z.number().describe('Position of the choice in the dropdown list.')
});

const InputSchema = z
    .object({
        label: z.string().describe('Display name for the field as seen by agents.'),
        type: z
            .string()
            .describe(
                'Field type. Examples: custom_text, custom_date, custom_dropdown, custom_number, custom_checkbox, custom_paragraph, custom_url, custom_phone_number.'
            ),
        position: z.number().optional().describe('Position of the company field in the form. Defaults to 1 if omitted.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents. Defaults to false.'),
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit this field in the agent interface. Defaults to true.'),
        displayed_for_agents: z.boolean().optional().describe('Whether agents can view this field in the agent interface. Defaults to true.'),
        quick_add_for_agent: z
            .boolean()
            .optional()
            .describe('Whether the field appears under the Quick-add field group in the company form. Defaults to false.'),
        unique: z
            .boolean()
            .optional()
            .describe('Whether the field value must be unique across companies. Only applicable for custom_text fields. Defaults to false.'),
        choices: z.array(CompanyFieldChoiceInputSchema).optional().describe('Dropdown choices when type is custom_dropdown.')
    })
    .describe('Input to create a company field in Freshdesk.');

const ProviderCompanyFieldChoiceSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string(),
    position: z.number()
});

const ProviderCompanyFieldSchema = z.object({
    id: z.number(),
    name: z.string(),
    label: z.string(),
    position: z.number(),
    required_for_agents: z.boolean(),
    agents_can_edit: z.boolean().optional(),
    displayed_for_agents: z.boolean().optional(),
    quick_add_for_agent: z.boolean().optional(),
    unique: z.boolean().optional(),
    type: z.string(),
    default: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    choices: z.array(ProviderCompanyFieldChoiceSchema).nullable().optional()
});

const CompanyFieldChoiceOutputSchema = z.object({
    id: z.number().describe('Unique identifier of the dropdown choice.'),
    label: z.string().describe('Display label of the dropdown choice.'),
    value: z.string().describe('Value of the dropdown choice.'),
    position: z.number().describe('Position of the dropdown choice in the list.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the company field.'),
        name: z.string().describe('System name (slug) generated from the label.'),
        label: z.string().describe('Display name for the field.'),
        position: z.number().describe('Position of the company field in the form.'),
        required_for_agents: z.boolean().describe('Whether the field is mandatory for agents.'),
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit this field in the agent interface.'),
        displayed_for_agents: z.boolean().optional().describe('Whether agents can view this field in the agent interface.'),
        quick_add_for_agent: z.boolean().optional().describe('Whether the field appears under the Quick-add field group in the company form.'),
        unique: z.boolean().optional().describe('Whether the field value must be unique across companies.'),
        type: z.string().describe('Field type.'),
        default: z.boolean().describe('Whether this is a default system field.'),
        created_at: z.string().describe('ISO 8601 timestamp when the field was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the field was last updated.'),
        choices: z.array(CompanyFieldChoiceOutputSchema).optional().describe('Dropdown choices when the field type is custom_dropdown.')
    })
    .describe('Created company field returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new custom company field in the Freshdesk account.
 * @pitfalls: The field name is auto-generated from the label and must be unique, so creating another field with the same label will fail with a conflict. agents_can_edit, displayed_for_agents, quick_add_for_agent and unique are only effective on accounts created from June 2022 or upgraded, and unique is only valid for custom_text fields.
 */
const action = createAction({
    description: 'Create a company field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_company_field
            endpoint: '/api/v2/company_fields',
            data: {
                label: input.label,
                type: input.type,
                ...(input.position !== undefined && { position: input.position }),
                ...(input.required_for_agents !== undefined && { required_for_agents: input.required_for_agents }),
                ...(input.agents_can_edit !== undefined && { agents_can_edit: input.agents_can_edit }),
                ...(input.displayed_for_agents !== undefined && { displayed_for_agents: input.displayed_for_agents }),
                ...(input.quick_add_for_agent !== undefined && { quick_add_for_agent: input.quick_add_for_agent }),
                ...(input.unique !== undefined && { unique: input.unique }),
                ...(input.choices !== undefined && {
                    choices: input.choices.map((choice) => ({
                        value: choice.value,
                        position: choice.position
                    }))
                })
            },
            retries: 1
        });

        const providerField = ProviderCompanyFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            label: providerField.label,
            position: providerField.position,
            required_for_agents: providerField.required_for_agents,
            ...(providerField.agents_can_edit !== undefined && { agents_can_edit: providerField.agents_can_edit }),
            ...(providerField.displayed_for_agents !== undefined && { displayed_for_agents: providerField.displayed_for_agents }),
            ...(providerField.quick_add_for_agent !== undefined && { quick_add_for_agent: providerField.quick_add_for_agent }),
            ...(providerField.unique !== undefined && { unique: providerField.unique }),
            type: providerField.type,
            default: providerField.default,
            created_at: providerField.created_at,
            updated_at: providerField.updated_at,
            ...(providerField.choices != null && { choices: providerField.choices })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
