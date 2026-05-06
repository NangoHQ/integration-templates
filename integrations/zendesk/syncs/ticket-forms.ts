import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TicketFormSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    raw_name: z.string().optional(),
    raw_display_name: z.string().optional(),
    position: z.number().int().optional(),
    ticket_field_ids: z.array(z.number().int()).optional(),
    active: z.boolean().optional(),
    default: z.boolean().optional(),
    end_user_visible: z.boolean().optional(),
    in_all_brands: z.boolean().optional(),
    restricted_brand_ids: z.array(z.number().int()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional(),
    url: z.string().optional()
});

const ProviderTicketFormSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    raw_name: z.string().optional(),
    raw_display_name: z.string().optional(),
    position: z.number().int().optional(),
    ticket_field_ids: z.array(z.number().int()).optional(),
    active: z.boolean().optional(),
    default: z.boolean().optional(),
    end_user_visible: z.boolean().optional(),
    in_all_brands: z.boolean().optional(),
    restricted_brand_ids: z.array(z.number().int()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().nullable().optional(),
    url: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    ticket_forms: z.array(ProviderTicketFormSchema).optional()
});

const sync = createSync({
    description: 'Sync ticket forms from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TicketForm: TicketFormSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/ticket-forms'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('TicketForm');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_forms/#list-ticket-forms
            endpoint: '/api/v2/ticket_forms',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'ticket_forms'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parseResult = ProviderListResponseSchema.safeParse({ ticket_forms: page });
            if (!parseResult.success) {
                throw new Error(`Failed to parse ticket forms: ${parseResult.error.message}`);
            }

            const ticketForms = parseResult.data.ticket_forms || [];
            const mappedForms = ticketForms.map((form) => ({
                id: String(form.id),
                ...(form.name !== undefined && form.name !== null && { name: form.name }),
                ...(form.display_name !== undefined && form.display_name !== null && { display_name: form.display_name }),
                ...(form.raw_name !== undefined && form.raw_name !== null && { raw_name: form.raw_name }),
                ...(form.raw_display_name !== undefined && form.raw_display_name !== null && { raw_display_name: form.raw_display_name }),
                ...(form.position !== undefined && form.position !== null && { position: form.position }),
                ...(form.ticket_field_ids !== undefined && form.ticket_field_ids !== null && { ticket_field_ids: form.ticket_field_ids }),
                ...(form.active !== undefined && form.active !== null && { active: form.active }),
                ...(form.default !== undefined && form.default !== null && { default: form.default }),
                ...(form.end_user_visible !== undefined && form.end_user_visible !== null && { end_user_visible: form.end_user_visible }),
                ...(form.in_all_brands !== undefined && form.in_all_brands !== null && { in_all_brands: form.in_all_brands }),
                ...(form.restricted_brand_ids !== undefined &&
                    form.restricted_brand_ids !== null && {
                        restricted_brand_ids: form.restricted_brand_ids
                    }),
                ...(form.created_at !== undefined && form.created_at !== null && { created_at: form.created_at }),
                ...(form.updated_at !== undefined && form.updated_at !== null && { updated_at: form.updated_at }),
                ...(form.deleted_at !== undefined && form.deleted_at !== null && { deleted_at: form.deleted_at }),
                ...(form.url !== undefined && form.url !== null && { url: form.url })
            }));

            if (mappedForms.length > 0) {
                await nango.batchSave(mappedForms, 'TicketForm');
            }
        }

        await nango.trackDeletesEnd('TicketForm');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
