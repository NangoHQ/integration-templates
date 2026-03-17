import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const ContactSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    nextCursor: z.string().optional()
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
            email: contact.properties?.['email'] ?? undefined,
            firstName: contact.properties?.['firstname'] ?? undefined,
            lastName: contact.properties?.['lastname'] ?? undefined,
            phone: contact.properties?.['phone'] ?? undefined,
            createdAt: contact.properties?.['createdate'] ?? undefined,
            updatedAt: contact.properties?.['lastmodifieddate'] ?? undefined
        }));

        return {
            contacts,
            nextCursor: data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
