import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'lead']),
    email: z.string().optional(),
    user_id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    last_seen_at: z.number().optional(),
    signed_up_at: z.number().optional(),
    avatar: z.string().optional(),
    company_ids: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const IntercomCompanySchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const IntercomCompaniesSchema = z
    .object({
        type: z.string().optional(),
        data: z.array(IntercomCompanySchema).optional()
    })
    .passthrough()
    .optional();

const IntercomAvatarSchema = z
    .object({
        type: z.string().optional(),
        image_url: z.string().nullable().optional()
    })
    .passthrough()
    .optional()
    .nullable();

const IntercomContactSchema = z
    .object({
        id: z.string(),
        role: z.enum(['user', 'lead']),
        email: z.string().nullable().optional(),
        user_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        created_at: z.number(),
        updated_at: z.number(),
        last_seen_at: z.number().nullable().optional(),
        signed_up_at: z.number().nullable().optional(),
        avatar: IntercomAvatarSchema,
        companies: IntercomCompaniesSchema
    })
    .passthrough();

const sync = createSync({
    description: 'Sync contacts (users and leads) from Intercom.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/contacts' }],
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: number;

        // On first run, look back 90 days to avoid fetching full history
        if (!checkpoint) {
            updatedAfter = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
        } else {
            updatedAfter = checkpoint.updated_after;
        }

        // cursor_name_in_request uses dot-path notation so lodash set() writes the cursor into
        // pagination.starting_after inside the body, not as a top-level key or query param.
        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/search
            endpoint: '/contacts/search',
            method: 'POST',
            data: {
                query: {
                    operator: 'AND',
                    value: [{ field: 'updated_at', operator: '>', value: updatedAfter }]
                },
                pagination: { per_page: 150 }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination.starting_after',
                cursor_path_in_response: 'pages.next.starting_after',
                response_path: 'data',
                limit_name_in_request: 'per_page',
                limit: 150
            },
            headers: { 'Intercom-Version': '2.11' },
            retries: 3
        };

        let maxUpdatedAt: number | undefined;

        for await (const contacts of nango.paginate<z.infer<typeof IntercomContactSchema>>(proxyConfig)) {
            const normalizedContacts = contacts.map((contact) => ({
                id: contact.id,
                role: contact.role,
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                ...(contact.email != null && { email: contact.email }),
                ...(contact.user_id != null && { user_id: contact.user_id }),
                ...(contact.name != null && { name: contact.name }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.last_seen_at != null && { last_seen_at: contact.last_seen_at }),
                ...(contact.signed_up_at != null && { signed_up_at: contact.signed_up_at }),
                ...(contact.avatar?.image_url != null && { avatar: contact.avatar.image_url }),
                ...(contact.companies?.data &&
                    contact.companies.data.length > 0 && {
                        company_ids: contact.companies.data.map((c) => c.id).filter((id): id is string => id != null)
                    })
            }));

            if (normalizedContacts.length > 0) {
                await nango.batchSave(normalizedContacts, 'Contact');

                for (const contact of normalizedContacts) {
                    if (maxUpdatedAt === undefined || contact.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = contact.updated_at;
                    }
                }
            }
        }

        if (maxUpdatedAt !== undefined) {
            // Store one second before max to re-fetch that second on the next run,
            // preventing same-second updates between runs from being missed.
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt - 1 });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
