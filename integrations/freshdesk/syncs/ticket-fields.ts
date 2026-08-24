import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderNestedTicketFieldSchema = z.object({
    id: z.number(),
    description: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    label_in_portal: z.string().nullable().optional(),
    level: z.number().nullable().optional(),
    name: z.string().nullable().optional(),
    ticket_field_id: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderTicketFieldSchema = z.object({
    id: z.number(),
    default: z.boolean().optional(),
    description: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    required_for_closure: z.boolean().optional(),
    type: z.string().nullable().optional(),
    required_for_agents: z.boolean().optional(),
    required_for_customers: z.boolean().optional(),
    label_for_customers: z.string().nullable().optional(),
    customers_can_edit: z.boolean().optional(),
    displayed_to_customers: z.boolean().optional(),
    portal_cc: z.boolean().optional(),
    portal_cc_to: z.string().nullable().optional(),
    choices: z.unknown().nullable().optional(),
    nested_ticket_fields: z.array(ProviderNestedTicketFieldSchema).nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const NestedTicketFieldSchema = z
    .object({
        id: z.number().describe('ID of the nested ticket field within the dependent field hierarchy.'),
        description: z.string().optional().describe('Description of the nested ticket field.'),
        label: z.string().optional().describe('Display label of the nested ticket field.'),
        label_in_portal: z.string().optional().describe('Portal display label of the nested ticket field.'),
        level: z.number().optional().describe('Hierarchy level of the nested ticket field.'),
        name: z.string().optional().describe('Internal name of the nested ticket field.'),
        ticket_field_id: z.number().optional().describe('ID of the parent ticket field this nested field belongs to.'),
        created_at: z.string().optional().describe('Creation timestamp of the nested ticket field in UTC.'),
        updated_at: z.string().optional().describe('Last update timestamp of the nested ticket field in UTC.')
    })
    .describe('A nested ticket field within a dependent (hierarchical) field structure.');

const TicketFieldSchema = z
    .object({
        id: z.string().describe('Stable string ID of the ticket field.'),
        default: z.boolean().optional().describe('Whether this is a built-in system field rather than a custom field.'),
        description: z.string().optional().describe('Description of the ticket field.'),
        label: z.string().optional().describe('Display name shown to agents.'),
        name: z.string().optional().describe('Internal machine name of the ticket field.'),
        position: z.number().optional().describe('Order in which the field appears in the ticket form.'),
        required_for_closure: z.boolean().optional().describe('Whether the field is mandatory before a ticket can be closed.'),
        type: z.string().optional().describe('Field type such as default_requester, custom_text, custom_dropdown, custom_date, nested_field, etc.'),
        required_for_agents: z.boolean().optional().describe('Whether the field is mandatory for agents when creating or updating tickets.'),
        required_for_customers: z.boolean().optional().describe('Whether the field is mandatory in the customer portal.'),
        label_for_customers: z.string().optional().describe('Display name shown to customers in the portal.'),
        customers_can_edit: z.boolean().optional().describe('Whether customers are allowed to edit this field in the portal.'),
        displayed_to_customers: z.boolean().optional().describe('Whether this field is visible to customers in the portal.'),
        portal_cc: z.boolean().optional().describe('For requester fields, whether customers can add additional requesters to the ticket.'),
        portal_cc_to: z.string().optional().describe('For requester fields with portal_cc enabled, who can be added (all or company).'),
        choices: z.unknown().optional().describe('List of allowed values for dropdown or dependent fields. Format varies by field type.'),
        nested_ticket_fields: z.array(NestedTicketFieldSchema).optional().describe('Nested sub-fields for dependent (hierarchical) ticket fields.'),
        created_at: z.string().optional().describe('Creation timestamp of the ticket field in UTC.'),
        updated_at: z.string().optional().describe('Last update timestamp of the ticket field in UTC.')
    })
    .describe('A ticket field definition from Freshdesk, including both built-in and custom fields.');

function mapTicketFields(pageResults: unknown[]): z.infer<typeof TicketFieldSchema>[] {
    return pageResults.map((record) => mapToTicketField(ProviderTicketFieldSchema.parse(record)));
}

function mapToTicketField(record: z.infer<typeof ProviderTicketFieldSchema>): z.infer<typeof TicketFieldSchema> {
    return {
        id: String(record.id),
        ...(record.default !== undefined && { default: record.default }),
        ...(record.description != null && { description: record.description }),
        ...(record.label != null && { label: record.label }),
        ...(record.name != null && { name: record.name }),
        ...(record.position != null && { position: record.position }),
        ...(record.required_for_closure !== undefined && { required_for_closure: record.required_for_closure }),
        ...(record.type != null && { type: record.type }),
        ...(record.required_for_agents !== undefined && { required_for_agents: record.required_for_agents }),
        ...(record.required_for_customers !== undefined && { required_for_customers: record.required_for_customers }),
        ...(record.label_for_customers != null && { label_for_customers: record.label_for_customers }),
        ...(record.customers_can_edit !== undefined && { customers_can_edit: record.customers_can_edit }),
        ...(record.displayed_to_customers !== undefined && { displayed_to_customers: record.displayed_to_customers }),
        ...(record.portal_cc !== undefined && { portal_cc: record.portal_cc }),
        ...(record.portal_cc_to != null && { portal_cc_to: record.portal_cc_to }),
        ...(record.choices != null && { choices: record.choices }),
        ...(record.nested_ticket_fields != null && {
            nested_ticket_fields: record.nested_ticket_fields.map((nested) => ({
                id: nested.id,
                ...(nested.description != null && { description: nested.description }),
                ...(nested.label != null && { label: nested.label }),
                ...(nested.label_in_portal != null && { label_in_portal: nested.label_in_portal }),
                ...(nested.level != null && { level: nested.level }),
                ...(nested.name != null && { name: nested.name }),
                ...(nested.ticket_field_id != null && { ticket_field_id: nested.ticket_field_id }),
                ...(nested.created_at != null && { created_at: nested.created_at }),
                ...(nested.updated_at != null && { updated_at: nested.updated_at })
            }))
        }),
        ...(record.created_at != null && { created_at: record.created_at }),
        ...(record.updated_at != null && { updated_at: record.updated_at })
    };
}

const sync = createSync({
    description: 'Sync ticket field definitions from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TicketField: TicketFieldSchema
    },

    // Delete-tracked syncs must always complete a full enumeration per Nango requirements.
    // Link-based pagination has no numeric page to persist across executions, so there is
    // no resumable checkpoint; an interrupted run is retried from the first page.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_ticket_fields
            endpoint: '/api/v2/ticket_fields',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
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
        const firstFields = mapTicketFields(first.value);
        if (firstFields.length === 0) {
            return;
        }

        await nango.trackDeletesStart('TicketField');

        await nango.batchSave(firstFields, 'TicketField');

        let next = await iterator.next();
        while (!next.done) {
            const fields = mapTicketFields(next.value);
            if (fields.length > 0) {
                await nango.batchSave(fields, 'TicketField');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('TicketField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
