import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('HubSpot contact ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Get a contact by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-contact',
        group: 'Contacts'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/contacts#get-contacts
        const response = await nango.get({
            endpoint: `/crm/v3/objects/contacts/${input.contactId}`,
            params: {
                properties: 'email,firstname,lastname'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contactId: input.contactId
            });
        }

        const data = response.data;

        return {
            id: data.id,
            email: data.properties?.['email'] ?? undefined,
            firstname: data.properties?.['firstname'] ?? undefined,
            lastname: data.properties?.['lastname'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
