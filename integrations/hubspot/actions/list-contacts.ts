import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const ContactSchema = z.object({
    id: z.string(),
    email: z.union([z.string(), z.null()]),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List contact records',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/contacts#get-page-of-contacts
        const response = await nango.get({
            endpoint: '/crm/v3/objects/contacts',
            params: {
                properties: 'email,firstname,lastname,phone,createdate,lastmodifieddate',
                limit: '100',
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const data = response.data;

        const contacts = (data.results || []).map((contact: any) => ({
            id: contact.id,
            email: contact.properties?.['email'] ?? null,
            first_name: contact.properties?.['firstname'] ?? null,
            last_name: contact.properties?.['lastname'] ?? null,
            phone: contact.properties?.['phone'] ?? null,
            created_at: contact.properties?.['createdate'] ?? null,
            updated_at: contact.properties?.['lastmodifieddate'] ?? null
        }));

        return {
            contacts,
            next_cursor: data.paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
