import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('HubSpot contact ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.union([z.string(), z.null()]),
    firstname: z.union([z.string(), z.null()]),
    lastname: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
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
            endpoint: `/crm/v3/objects/contacts/${input.contact_id}`,
            params: {
                properties: 'email,firstname,lastname'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contact_id: input.contact_id
            });
        }

        const data = response.data;

        return {
            id: data.id,
            email: data.properties?.['email'] ?? null,
            firstname: data.properties?.['firstname'] ?? null,
            lastname: data.properties?.['lastname'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
