import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomFieldOptionSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    raw_name: z.string().optional(),
    value: z.string().optional(),
    default: z.boolean().optional()
});

const SystemFieldOptionSchema = z.object({
    name: z.string().optional(),
    value: z.string().optional()
});

const ProviderTicketFieldSchema = z.object({
    id: z.number(),
    type: z.string(),
    title: z.string(),
    raw_title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    raw_description: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    active: z.boolean().nullable().optional(),
    required: z.boolean().nullable().optional(),
    agent_can_edit: z.boolean().nullable().optional(),
    removable: z.boolean().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    visible_in_portal: z.boolean().nullable().optional(),
    editable_in_portal: z.boolean().nullable().optional(),
    required_in_portal: z.boolean().nullable().optional(),
    title_in_portal: z.string().nullable().optional(),
    raw_title_in_portal: z.string().nullable().optional(),
    tag: z.string().nullable().optional(),
    regexp_for_validation: z.string().nullable().optional(),
    sub_type_id: z.number().nullable().optional(),
    custom_field_options: z.array(CustomFieldOptionSchema).nullable().optional(),
    system_field_options: z.array(SystemFieldOptionSchema).nullable().optional()
});

const TicketFieldSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    raw_title: z.string().optional(),
    description: z.string().optional(),
    raw_description: z.string().optional(),
    position: z.number().optional(),
    active: z.boolean().optional(),
    required: z.boolean().optional(),
    agent_can_edit: z.boolean().optional(),
    removable: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    visible_in_portal: z.boolean().optional(),
    editable_in_portal: z.boolean().optional(),
    required_in_portal: z.boolean().optional(),
    title_in_portal: z.string().optional(),
    raw_title_in_portal: z.string().optional(),
    tag: z.string().optional(),
    regexp_for_validation: z.string().optional(),
    sub_type_id: z.number().optional(),
    custom_field_options: z.array(CustomFieldOptionSchema).optional(),
    system_field_options: z.array(SystemFieldOptionSchema).optional()
});

// https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/
const sync = createSync({
    description: 'Sync ticket field definitions from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TicketField: TicketFieldSchema
    },
    // https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/ticket-fields'
        }
    ],

    exec: async (nango) => {
        // Blocker: The Zendesk ticket fields API does not support incremental filtering.
        // It returns all ticket fields without changed-since or modified_after parameters.
        // This is reference metadata that changes infrequently, so full refresh is appropriate.
        await nango.trackDeletesStart('TicketField');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/#list-ticket-fields
            endpoint: '/api/v2/ticket_fields',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page[after]',
                cursor_path_in_response: 'meta.after_cursor',
                response_path: 'ticket_fields',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const ticketFields: Array<z.infer<typeof TicketFieldSchema>> = [];

            for (const record of page) {
                const parseResult = ProviderTicketFieldSchema.safeParse(record);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse ticket field: ${JSON.stringify(parseResult.error.issues)}`);
                }
                const raw = parseResult.data;

                ticketFields.push({
                    id: String(raw.id),
                    type: raw.type,
                    title: raw.title,
                    ...(raw.raw_title != null && { raw_title: raw.raw_title }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.raw_description != null && { raw_description: raw.raw_description }),
                    ...(raw.position != null && { position: raw.position }),
                    ...(raw.active != null && { active: raw.active }),
                    ...(raw.required != null && { required: raw.required }),
                    ...(raw.agent_can_edit != null && { agent_can_edit: raw.agent_can_edit }),
                    ...(raw.removable != null && { removable: raw.removable }),
                    created_at: raw.created_at,
                    updated_at: raw.updated_at,
                    ...(raw.visible_in_portal != null && { visible_in_portal: raw.visible_in_portal }),
                    ...(raw.editable_in_portal != null && { editable_in_portal: raw.editable_in_portal }),
                    ...(raw.required_in_portal != null && { required_in_portal: raw.required_in_portal }),
                    ...(raw.title_in_portal != null && { title_in_portal: raw.title_in_portal }),
                    ...(raw.raw_title_in_portal != null && { raw_title_in_portal: raw.raw_title_in_portal }),
                    ...(raw.tag != null && { tag: raw.tag }),
                    ...(raw.regexp_for_validation != null && { regexp_for_validation: raw.regexp_for_validation }),
                    ...(raw.sub_type_id != null && { sub_type_id: raw.sub_type_id }),
                    ...(raw.custom_field_options != null && {
                        custom_field_options: raw.custom_field_options.map((opt) => ({
                            ...(opt.id !== undefined && { id: opt.id }),
                            ...(opt.name !== undefined && { name: opt.name }),
                            ...(opt.raw_name !== undefined && { raw_name: opt.raw_name }),
                            ...(opt.value !== undefined && { value: opt.value }),
                            ...(opt.default !== undefined && { default: opt.default })
                        }))
                    }),
                    ...(raw.system_field_options != null && {
                        system_field_options: raw.system_field_options.map((opt) => ({
                            ...(opt.name !== undefined && { name: opt.name }),
                            ...(opt.value !== undefined && { value: opt.value })
                        }))
                    })
                });
            }

            if (ticketFields.length > 0) {
                await nango.batchSave(ticketFields, 'TicketField');
            }
        }

        await nango.trackDeletesEnd('TicketField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
