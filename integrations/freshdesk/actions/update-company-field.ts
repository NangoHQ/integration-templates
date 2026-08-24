import { z } from 'zod';
import { createAction } from 'nango';

const ChoiceInputSchema = z.object({
    id: z.number().optional().describe('Existing choice ID to update. Omit when creating a new choice.'),
    value: z.string().optional().describe('Choice label and value text.'),
    position: z.number().optional().describe('Position of the choice in the dropdown list.'),
    deleted: z.boolean().optional().describe('Set to true to remove an existing choice identified by its id.')
});

const InputSchema = z
    .object({
        id: z.number().describe('ID of the company field to update. Example: 9'),
        label: z.string().optional().describe('Display name for the field as seen by agents.'),
        position: z.number().optional().describe('Position of the company field in the form.'),
        required_for_agents: z.boolean().optional().describe('Set to true if the field is mandatory for agents.'),
        agents_can_edit: z.boolean().optional().describe('Set to false if agents cannot edit this field in the agent interface. Default is true.'),
        displayed_for_agents: z.boolean().optional().describe('Set to false if agents cannot view this field in the agent interface. Default is true.'),
        quick_add_for_agent: z.boolean().optional().describe('Set to true if the field appears under Quick-add in the company form. Default is false.'),
        unique: z.boolean().optional().describe('Set to true to prevent duplicate company values for this field. Only supported for custom_text fields.'),
        choices: z.array(ChoiceInputSchema).optional().describe('Dropdown choices to create, update, or delete. Applicable only for custom_dropdown fields.')
    })
    .describe('Input to update a company field in Freshdesk.');

const ChoiceOutputSchema = z.object({
    id: z.number().describe('ID of the dropdown choice.'),
    label: z.string().describe('Display label of the choice.'),
    value: z.string().describe('Value of the choice.'),
    position: z.number().describe('Position of the choice in the dropdown list.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the company field.'),
        name: z.string().describe('API name of the company field.'),
        label: z.string().describe('Display name for the field as seen by agents.'),
        position: z.number().describe('Position of the company field in the form.'),
        required_for_agents: z.boolean().describe('Whether the field is mandatory for agents.'),
        agents_can_edit: z.boolean().describe('Whether agents can edit this field in the agent interface.'),
        displayed_for_agents: z.boolean().describe('Whether agents can view this field in the agent interface.'),
        quick_add_for_agent: z.boolean().describe('Whether the field appears under Quick-add in the company form.'),
        unique: z.boolean().describe('Whether the field prevents duplicate company values.'),
        type: z.string().describe('Field type, e.g. custom_text or custom_dropdown.'),
        default: z.boolean().describe('Whether this is a built-in (non-custom) field.'),
        created_at: z.string().describe('Timestamp when the field was created, in UTC.'),
        updated_at: z.string().describe('Timestamp when the field was last updated, in UTC.'),
        choices: z.array(ChoiceOutputSchema).optional().describe('Dropdown choices for the field, present when type is custom_dropdown.')
    })
    .describe('The updated company field object returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing company field configuration in Freshdesk.
 * @pitfalls: Only admins can modify company fields; agents_can_edit, displayed_for_agents, quick_add_for_agent, and unique require a post-June-2022 or upgraded account. unique is only supported for custom_text fields, and choices is only applicable for custom_dropdown fields.
 */
const action = createAction({
    description: 'Update a company field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.label !== undefined) {
            data['label'] = input.label;
        }
        if (input.position !== undefined) {
            data['position'] = input.position;
        }
        if (input.required_for_agents !== undefined) {
            data['required_for_agents'] = input.required_for_agents;
        }
        if (input.agents_can_edit !== undefined) {
            data['agents_can_edit'] = input.agents_can_edit;
        }
        if (input.displayed_for_agents !== undefined) {
            data['displayed_for_agents'] = input.displayed_for_agents;
        }
        if (input.quick_add_for_agent !== undefined) {
            data['quick_add_for_agent'] = input.quick_add_for_agent;
        }
        if (input.unique !== undefined) {
            data['unique'] = input.unique;
        }
        if (input.choices !== undefined) {
            data['choices'] = input.choices;
        }

        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_company_field
            endpoint: `/api/v2/company_fields/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
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
            choices: z.array(z.unknown()).nullish()
        });

        const providerField = ProviderCompanyFieldSchema.parse(response.data);

        const mappedChoices = ((): Array<z.infer<typeof ChoiceOutputSchema>> | undefined => {
            if (!Array.isArray(providerField.choices)) {
                return undefined;
            }
            const ChoiceItemSchema = z.object({
                id: z.number(),
                label: z.string(),
                value: z.string(),
                position: z.number()
            });
            const result: Array<z.infer<typeof ChoiceOutputSchema>> = [];
            for (const item of providerField.choices) {
                if (typeof item === 'object' && item !== null) {
                    const parsed = ChoiceItemSchema.safeParse(item);
                    if (parsed.success) {
                        result.push(parsed.data);
                    }
                }
            }
            return result.length > 0 ? result : undefined;
        })();

        return {
            id: providerField.id,
            name: providerField.name,
            label: providerField.label,
            position: providerField.position,
            required_for_agents: providerField.required_for_agents,
            agents_can_edit: providerField.agents_can_edit ?? true,
            displayed_for_agents: providerField.displayed_for_agents ?? true,
            quick_add_for_agent: providerField.quick_add_for_agent ?? false,
            unique: providerField.unique ?? false,
            type: providerField.type,
            default: providerField.default,
            created_at: providerField.created_at,
            updated_at: providerField.updated_at,
            ...(mappedChoices !== undefined && { choices: mappedChoices })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
