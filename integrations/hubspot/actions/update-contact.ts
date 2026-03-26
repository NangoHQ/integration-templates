import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The ID of the contact to update. Example: "12345"'),
    firstName: z.string().optional().describe('First name of the contact.'),
    lastName: z.string().optional().describe('Last name of the contact.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    company: z.string().optional().describe('Company name of the contact.'),
    jobTitle: z.string().optional().describe('Job title of the contact.')
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Update a contact record',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-contact',
        group: 'Contacts'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {};

        if (input.firstName) properties['firstname'] = input.firstName;
        if (input.lastName) properties['lastname'] = input.lastName;
        if (input.email) properties['email'] = input.email;
        if (input.phone) properties['phone'] = input.phone;
        if (input.company) properties['company'] = input.company;
        if (input.jobTitle) properties['jobtitle'] = input.jobTitle;

        const response = await nango.patch({
            // https://developers.hubspot.com/docs/api/crm/contacts
            endpoint: `/crm/v3/objects/contacts/${input.contactId}`,
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            firstName: data.properties?.['firstname'] ?? undefined,
            lastName: data.properties?.['lastname'] ?? undefined,
            email: data.properties?.['email'] ?? undefined,
            phone: data.properties?.['phone'] ?? undefined,
            company: data.properties?.['company'] ?? undefined,
            jobTitle: data.properties?.['jobtitle'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
