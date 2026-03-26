import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the contact. Example: "john.doe@example.com"'),
    firstname: z.string().optional().describe('First name of the contact. Example: "John"'),
    lastname: z.string().optional().describe('Last name of the contact. Example: "Doe"'),
    phone: z.string().optional().describe('Phone number of the contact. Example: "+1 555-1234"'),
    company: z.string().optional().describe('Company name of the contact. Example: "Acme Inc"'),
    website: z.string().optional().describe('Website URL of the contact. Example: "https://example.com"')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    website: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a contact record',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-contact',
        group: 'Contacts'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {
            email: input.email
        };

        if (input.firstname) properties['firstname'] = input.firstname;
        if (input.lastname) properties['lastname'] = input.lastname;
        if (input.phone) properties['phone'] = input.phone;
        if (input.company) properties['company'] = input.company;
        if (input.website) properties['website'] = input.website;

        // https://developers.hubspot.com/docs/api/crm/contacts#create-contacts
        const response = await nango.post({
            endpoint: '/crm/v3/objects/contacts',
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            email: data.properties?.['email'] ?? undefined,
            firstname: data.properties?.['firstname'] ?? undefined,
            lastname: data.properties?.['lastname'] ?? undefined,
            phone: data.properties?.['phone'] ?? undefined,
            company: data.properties?.['company'] ?? undefined,
            website: data.properties?.['website'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
