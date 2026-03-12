import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The ID of the contact to update. Example: "12345"'),
    first_name: z.string().optional().describe('First name of the contact.'),
    last_name: z.string().optional().describe('Last name of the contact.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    company: z.string().optional().describe('Company name of the contact.'),
    job_title: z.string().optional().describe('Job title of the contact.')
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    company: z.union([z.string(), z.null()]),
    job_title: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Update a contact record',
    version: '1.0.0',

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

        if (input.first_name) properties['firstname'] = input.first_name;
        if (input.last_name) properties['lastname'] = input.last_name;
        if (input.email) properties['email'] = input.email;
        if (input.phone) properties['phone'] = input.phone;
        if (input.company) properties['company'] = input.company;
        if (input.job_title) properties['jobtitle'] = input.job_title;

        const response = await nango.patch({
            // https://developers.hubspot.com/docs/api/crm/contacts
            endpoint: `/crm/v3/objects/contacts/${input.contact_id}`,
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            first_name: data.properties?.['firstname'] ?? null,
            last_name: data.properties?.['lastname'] ?? null,
            email: data.properties?.['email'] ?? null,
            phone: data.properties?.['phone'] ?? null,
            company: data.properties?.['company'] ?? null,
            job_title: data.properties?.['jobtitle'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
