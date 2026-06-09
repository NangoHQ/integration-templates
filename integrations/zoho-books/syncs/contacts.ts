import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    status: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    status: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync contacts from Zoho Books',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    endpoints: [{ method: 'POST', path: '/syncs/contacts' }],
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('organization_id is required in metadata');
        }

        const organizationId = parsedMetadata.data.organization_id;

        // https://www.zoho.com/books/api/v3/contacts/#list-contacts
        // Blocker: List Contacts does not support a last_modified_time or updated_after filter.
        // It only supports sorting by last_modified_time. There is no deleted-record endpoint.
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/contacts/#list-contacts
            endpoint: '/books/v3/contacts',
            params: {
                organization_id: organizationId,
                sort_column: 'last_modified_time',
                sort_order: 'A'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 2,
                response_path: 'contacts'
            },
            retries: 3
        };

        for await (const contacts of nango.paginate(proxyConfig)) {
            const parsedContacts = z.array(ProviderContactSchema).safeParse(contacts);
            if (!parsedContacts.success) {
                throw new Error('Failed to parse contacts from provider response');
            }

            const mappedContacts = parsedContacts.data.map((contact) => ({
                id: contact.contact_id,
                ...(contact.contact_name != null && { contact_name: contact.contact_name }),
                ...(contact.company_name != null && { company_name: contact.company_name }),
                ...(contact.contact_type != null && { contact_type: contact.contact_type }),
                ...(contact.status != null && { status: contact.status }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.created_time != null && { created_time: contact.created_time }),
                ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time })
            }));

            if (mappedContacts.length > 0) {
                await nango.batchSave(mappedContacts, 'Contact');
            }
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
