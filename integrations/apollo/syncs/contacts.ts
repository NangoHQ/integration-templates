import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider response schema for raw Apollo contact data
const ApolloContactSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    email_status: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    organization_name: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    contact_stage_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    creator_id: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    original_source: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    present_raw_address: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable().optional(),
    contact_last_activity_date: z.string().nullable().optional(),
    emailer_campaign_ids: z.array(z.string()).optional(),
    salesforce_id: z.string().nullable().optional(),
    salesforce_lead_id: z.string().nullable().optional(),
    salesforce_contact_id: z.string().nullable().optional(),
    salesforce_account_id: z.string().nullable().optional(),
    crm_owner_id: z.string().nullable().optional(),
    phone_numbers: z
        .array(
            z.object({
                sanitized_number: z.string().nullable().optional(),
                raw_number: z.string().nullable().optional(),
                type: z.string().nullable().optional(),
                position: z.number().nullable().optional()
            })
        )
        .optional()
});

// Normalized Contact model for Nango
const ContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    email_status: z.string().optional(),
    title: z.string().optional(),
    organization_name: z.string().optional(),
    organization_id: z.string().optional(),
    contact_stage_id: z.string().optional(),
    owner_id: z.string().optional(),
    creator_id: z.string().optional(),
    source: z.string().optional(),
    original_source: z.string().optional(),
    linkedin_url: z.string().optional(),
    photo_url: z.string().optional(),
    present_raw_address: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    contact_last_activity_date: z.string().optional(),
    salesforce_id: z.string().optional(),
    salesforce_lead_id: z.string().optional(),
    salesforce_contact_id: z.string().optional(),
    salesforce_account_id: z.string().optional(),
    crm_owner_id: z.string().optional(),
    phone_numbers: z
        .array(
            z.object({
                sanitized_number: z.string().optional(),
                raw_number: z.string().optional(),
                type: z.string().optional(),
                position: z.number().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync contacts from Apollo',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },
    endpoints: [
        // https://docs.apollo.io/reference/search-for-contacts
        {
            path: '/syncs/contacts',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: The Apollo contacts search endpoint does not expose an
        // updated_after filter or a changed-records endpoint. It only supports
        // sorting by contact_updated_at. Without a way to query only changed
        // records, we must perform a full refresh with deletion detection.
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/search-for-contacts
            endpoint: '/v1/contacts/search',
            method: 'POST',
            data: {
                sort_by_field: 'contact_updated_at',
                sort_ascending: true
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'contacts'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawContacts = page;
            if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
                continue;
            }

            const contacts = rawContacts.map((raw) => {
                const parsed = ApolloContactSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact: ${parsed.error.message}`);
                }
                const c = parsed.data;
                return {
                    id: c.id,
                    ...(c.first_name != null && { first_name: c.first_name }),
                    ...(c.last_name != null && { last_name: c.last_name }),
                    ...(c.name != null && { name: c.name }),
                    ...(c.email != null && { email: c.email }),
                    ...(c.email_status != null && {
                        email_status: c.email_status
                    }),
                    ...(c.title != null && { title: c.title }),
                    ...(c.organization_name != null && {
                        organization_name: c.organization_name
                    }),
                    ...(c.organization_id != null && {
                        organization_id: c.organization_id
                    }),
                    ...(c.contact_stage_id != null && {
                        contact_stage_id: c.contact_stage_id
                    }),
                    ...(c.owner_id != null && { owner_id: c.owner_id }),
                    ...(c.creator_id != null && { creator_id: c.creator_id }),
                    ...(c.source != null && { source: c.source }),
                    ...(c.original_source != null && {
                        original_source: c.original_source
                    }),
                    ...(c.linkedin_url != null && {
                        linkedin_url: c.linkedin_url
                    }),
                    ...(c.photo_url != null && { photo_url: c.photo_url }),
                    ...(c.present_raw_address != null && {
                        present_raw_address: c.present_raw_address
                    }),
                    created_at: c.created_at,
                    ...(c.updated_at != null && { updated_at: c.updated_at }),
                    ...(c.contact_last_activity_date != null && {
                        contact_last_activity_date: c.contact_last_activity_date
                    }),
                    ...(c.salesforce_id != null && {
                        salesforce_id: c.salesforce_id
                    }),
                    ...(c.salesforce_lead_id != null && {
                        salesforce_lead_id: c.salesforce_lead_id
                    }),
                    ...(c.salesforce_contact_id != null && {
                        salesforce_contact_id: c.salesforce_contact_id
                    }),
                    ...(c.salesforce_account_id != null && {
                        salesforce_account_id: c.salesforce_account_id
                    }),
                    ...(c.crm_owner_id != null && {
                        crm_owner_id: c.crm_owner_id
                    }),
                    ...(c.phone_numbers != null &&
                        c.phone_numbers.length > 0 && {
                            phone_numbers: c.phone_numbers.map((p) => ({
                                ...(p.sanitized_number != null && {
                                    sanitized_number: p.sanitized_number
                                }),
                                ...(p.raw_number != null && {
                                    raw_number: p.raw_number
                                }),
                                ...(p.type != null && { type: p.type }),
                                ...(p.position != null && {
                                    position: p.position
                                })
                            }))
                        })
                };
            });

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export default sync;
