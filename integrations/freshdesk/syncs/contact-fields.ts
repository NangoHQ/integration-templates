import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderContactFieldSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    label: z.string().optional(),
    position: z.number().optional(),
    type: z.string().optional(),
    default: z.boolean().optional(),
    editable_in_signup: z.boolean().optional(),
    required_for_agents: z.boolean().optional(),
    customers_can_edit: z.boolean().optional(),
    label_for_customers: z.string().optional(),
    required_for_customers: z.boolean().optional(),
    displayed_for_customers: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ContactFieldSchema = z
    .object({
        id: z.string().describe('Unique identifier of the contact field'),
        name: z.string().optional().describe('System name of the contact field used in API requests'),
        label: z.string().optional().describe('Display label shown to agents'),
        position: z.number().optional().describe('Order position of the field in the form'),
        type: z.string().optional().describe('Data type of the contact field (e.g., custom_dropdown, custom_text)'),
        default: z.boolean().optional().describe('Whether this is a system default field'),
        editable_in_signup: z.boolean().optional().describe('Whether the field can be edited during signup'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents'),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit this field'),
        label_for_customers: z.string().optional().describe('Display label shown to customers'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory for customers'),
        displayed_for_customers: z.boolean().optional().describe('Whether the field is visible to customers'),
        created_at: z.string().optional().describe('UTC timestamp when the field was created'),
        updated_at: z.string().optional().describe('UTC timestamp when the field was last updated')
    })
    .describe('A contact field definition in Freshdesk');

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync contact field definitions from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ContactField: ContactFieldSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.['page'] ?? 1;

        await nango.trackDeletesStart('ContactField');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_contact_fields
            endpoint: '/api/v2/contact_fields',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async (paginationState: { nextPageParam?: string | number | undefined; response: unknown }) => {
                    page = typeof paginationState.nextPageParam === 'number' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const fields = pageResults.map((record) => {
                const parsed = ProviderContactFieldSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact field: ${parsed.error.message}`);
                }
                const field = parsed.data;
                return {
                    id: String(field.id),
                    ...(field.name != null && { name: field.name }),
                    ...(field.label != null && { label: field.label }),
                    ...(field.position != null && { position: field.position }),
                    ...(field.type != null && { type: field.type }),
                    ...(field.default != null && { default: field.default }),
                    ...(field.editable_in_signup != null && { editable_in_signup: field.editable_in_signup }),
                    ...(field.required_for_agents != null && { required_for_agents: field.required_for_agents }),
                    ...(field.customers_can_edit != null && { customers_can_edit: field.customers_can_edit }),
                    ...(field.label_for_customers != null && { label_for_customers: field.label_for_customers }),
                    ...(field.required_for_customers != null && { required_for_customers: field.required_for_customers }),
                    ...(field.displayed_for_customers != null && { displayed_for_customers: field.displayed_for_customers }),
                    ...(field.created_at != null && { created_at: field.created_at }),
                    ...(field.updated_at != null && { updated_at: field.updated_at })
                };
            });

            if (fields.length > 0) {
                await nango.batchSave(fields, 'ContactField');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ContactField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
