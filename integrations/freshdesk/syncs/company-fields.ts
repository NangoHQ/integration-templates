import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderChoiceSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string(),
    position: z.number()
});

const ProviderCompanyFieldSchema = z.object({
    id: z.number(),
    name: z.string(),
    label: z.string(),
    description: z.string().nullable().optional(),
    type: z.string(),
    default: z.boolean(),
    required_for_agents: z.boolean().optional(),
    required_for_customers: z.boolean().optional(),
    required_for_closure: z.boolean().optional(),
    agents_can_edit: z.boolean().optional(),
    displayed_for_agents: z.boolean().optional(),
    quick_add_for_agent: z.boolean().optional(),
    unique: z.boolean().optional(),
    position: z.number().optional(),
    choices: z.array(z.unknown()).nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ChoiceSchema = z
    .object({
        id: z.number().describe('Unique identifier of the dropdown choice.'),
        label: z.string().describe('Display label of the dropdown choice.'),
        value: z.string().describe('Internal value of the dropdown choice.'),
        position: z.number().describe('Display order position of the dropdown choice.')
    })
    .describe('A single dropdown choice option for a company field.');

const CompanyFieldSchema = z
    .object({
        id: z.string().describe('Unique identifier of the company field.'),
        name: z.string().describe('Internal machine name of the field.'),
        label: z.string().describe('Human-readable display label of the field.'),
        description: z.string().optional().describe('Description or help text for the field.'),
        type: z.string().describe('Data type of the field (e.g., custom_dropdown, custom_text).'),
        default: z.boolean().describe('Whether this is a default system field.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is required when agents create or update companies.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is required in the customer portal.'),
        required_for_closure: z.boolean().optional().describe('Whether the field must be filled before closing a related ticket.'),
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit the field in the agent interface.'),
        displayed_for_agents: z.boolean().optional().describe('Whether the field is visible to agents in the agent interface.'),
        quick_add_for_agent: z.boolean().optional().describe('Whether the field appears in the quick-add field group in the contact form.'),
        unique: z.boolean().optional().describe('Whether the field enforces unique values across companies.'),
        position: z.number().optional().describe('Display order position of the field.'),
        choices: z.array(ChoiceSchema).optional().describe('Available choices for dropdown-type fields.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the field was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the field was last updated.')
    })
    .describe('A company field definition in Freshdesk, including both default and custom fields.');

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync company field definitions from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CompanyField: CompanyFieldSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /api/v2/company_fields with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint != null && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        await nango.trackDeletesStart('CompanyField');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_company_fields
            endpoint: '/api/v2/company_fields',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async (paginationState) => {
                    page = typeof paginationState.nextPageParam === 'number' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const records: unknown[] = pageResults;
            const fields = records.map((raw) => {
                const parsed = ProviderCompanyFieldSchema.parse(raw);
                return {
                    id: String(parsed.id),
                    name: parsed.name,
                    label: parsed.label,
                    ...(parsed.description != null && { description: parsed.description }),
                    type: parsed.type,
                    default: parsed.default,
                    ...(parsed.required_for_agents !== undefined && { required_for_agents: parsed.required_for_agents }),
                    ...(parsed.required_for_customers !== undefined && { required_for_customers: parsed.required_for_customers }),
                    ...(parsed.required_for_closure !== undefined && { required_for_closure: parsed.required_for_closure }),
                    ...(parsed.agents_can_edit !== undefined && { agents_can_edit: parsed.agents_can_edit }),
                    ...(parsed.displayed_for_agents !== undefined && { displayed_for_agents: parsed.displayed_for_agents }),
                    ...(parsed.quick_add_for_agent !== undefined && { quick_add_for_agent: parsed.quick_add_for_agent }),
                    ...(parsed.unique !== undefined && { unique: parsed.unique }),
                    ...(parsed.position !== undefined && { position: parsed.position }),
                    ...(parsed.choices != null && {
                        choices: parsed.choices.map((choice, index) => {
                            if (typeof choice === 'string') {
                                return {
                                    id: index,
                                    label: choice,
                                    value: choice,
                                    position: index
                                };
                            }
                            return ProviderChoiceSchema.parse(choice);
                        })
                    }),
                    ...(parsed.created_at != null && { created_at: parsed.created_at }),
                    ...(parsed.updated_at != null && { updated_at: parsed.updated_at })
                };
            });

            if (fields.length > 0) {
                await nango.batchSave(fields, 'CompanyField');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CompanyField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
