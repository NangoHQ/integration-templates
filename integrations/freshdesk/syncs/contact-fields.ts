import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderChoiceObjectSchema = z
    .object({
        id: z.number().optional(),
        label: z.string(),
        value: z.string(),
        position: z.number().optional()
    })
    .passthrough();

// Freshdesk returns choices as a map (e.g. time zones, where the key is the internal value and
// the map value is the display label), a string array (e.g. social handles), or an array of
// choice objects (custom dropdown fields), depending on field type.
const ProviderChoicesSchema = z.union([z.array(ProviderChoiceObjectSchema), z.array(z.string()), z.record(z.string(), z.string())]);

const ProviderContactFieldSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    label: z.string().optional(),
    position: z.number().optional(),
    type: z.string().optional(),
    default: z.boolean().optional(),
    editable_in_signup: z.boolean().optional(),
    required_for_agents: z.boolean().optional(),
    agents_can_edit: z.boolean().optional(),
    displayed_for_agents: z.boolean().optional(),
    quick_add_for_agent: z.boolean().optional(),
    unique: z.boolean().optional(),
    customers_can_edit: z.boolean().optional(),
    label_for_customers: z.string().optional(),
    required_for_customers: z.boolean().optional(),
    displayed_for_customers: z.boolean().optional(),
    choices: ProviderChoicesSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ChoiceSchema = z.object({
    id: z.number().describe('Unique identifier of the dropdown choice.'),
    label: z.string().describe('Display label of the dropdown choice.'),
    value: z.string().describe('Internal value of the dropdown choice.'),
    position: z.number().describe('Display order position of the dropdown choice.')
});

function normalizeChoices(choices: z.infer<typeof ProviderChoicesSchema> | undefined): z.infer<typeof ChoiceSchema>[] | undefined {
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
    // The map's key is the internal value used when setting the field, and its value is the
    // human-readable label (e.g. { "International Date Line West": "(GMT-12:00) International..." }).
    return Object.entries(choices).map(([value, label], index) => ({ id: index, label, value, position: index }));
}

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
        agents_can_edit: z.boolean().optional().describe('Whether agents can edit the field in the agent interface'),
        displayed_for_agents: z.boolean().optional().describe('Whether the field is visible to agents in the agent interface'),
        quick_add_for_agent: z.boolean().optional().describe('Whether the field appears in the quick-add field group'),
        unique: z.boolean().optional().describe('Whether the field enforces unique values across contacts'),
        customers_can_edit: z.boolean().optional().describe('Whether customers can edit this field'),
        label_for_customers: z.string().optional().describe('Display label shown to customers'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory for customers'),
        displayed_for_customers: z.boolean().optional().describe('Whether the field is visible to customers'),
        choices: z.array(ChoiceSchema).optional().describe('Available choices for dropdown-type fields.'),
        created_at: z.string().optional().describe('UTC timestamp when the field was created'),
        updated_at: z.string().optional().describe('UTC timestamp when the field was last updated')
    })
    .describe('A contact field definition in Freshdesk');

function mapContactFields(pageResults: unknown[]): z.infer<typeof ContactFieldSchema>[] {
    return pageResults.map((record) => {
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
            ...(field.agents_can_edit != null && { agents_can_edit: field.agents_can_edit }),
            ...(field.displayed_for_agents != null && { displayed_for_agents: field.displayed_for_agents }),
            ...(field.quick_add_for_agent != null && { quick_add_for_agent: field.quick_add_for_agent }),
            ...(field.unique != null && { unique: field.unique }),
            ...(field.customers_can_edit != null && { customers_can_edit: field.customers_can_edit }),
            ...(field.label_for_customers != null && { label_for_customers: field.label_for_customers }),
            ...(field.required_for_customers != null && { required_for_customers: field.required_for_customers }),
            ...(field.displayed_for_customers != null && { displayed_for_customers: field.displayed_for_customers }),
            ...(normalizeChoices(field.choices) != null && { choices: normalizeChoices(field.choices) }),
            ...(field.created_at != null && { created_at: field.created_at }),
            ...(field.updated_at != null && { updated_at: field.updated_at })
        };
    });
}

const sync = createSync({
    description: 'Sync contact field definitions from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ContactField: ContactFieldSchema
    },

    // Delete-tracked syncs must always start from page 1 and complete a full enumeration
    // per Nango requirements; there is no resumable checkpoint.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_contact_fields
            endpoint: '/api/v2/contact_fields',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const iterator = nango.paginate(proxyConfig);

        // Fetch and validate the first page before opening the delete-tracking window, so a
        // transient empty or invalid response can't wipe out previously-synced records. An empty
        // first page is inconclusive (it may be a transient provider glitch rather than a genuine
        // zero-record account), so skip this run entirely rather than opening a tracking window
        // that would delete every previously-synced record; the next scheduled run retries.
        const first = await iterator.next();
        if (first.done) {
            return;
        }
        const firstFields = mapContactFields(first.value);
        if (firstFields.length === 0) {
            return;
        }

        await nango.trackDeletesStart('ContactField');

        await nango.batchSave(firstFields, 'ContactField');

        let next = await iterator.next();
        while (!next.done) {
            const fields = mapContactFields(next.value);
            if (fields.length > 0) {
                await nango.batchSave(fields, 'ContactField');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('ContactField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
