import { z } from 'zod';
import { createAction } from 'nango';

const ContactIdentifierSchema = z
    .object({
        id: z.string().optional().describe('Intercom contact ID. Example: "5f5e8b5a8b5a8b5a8b5a8b5a"'),
        email: z.string().email().optional().describe('Contact email address. Example: "user@example.com"')
    })
    .refine((data) => data.id || data.email, {
        message: 'Either id or email must be provided'
    });

const InputSchema = z.object({
    tag_name: z.string().describe('Name of the tag to remove from contacts. Example: "VIP"'),
    contacts: z.array(ContactIdentifierSchema).describe('Array of contacts to untag, each with either id or email')
});

const ProviderUserResultSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    users: z.array(ProviderUserResultSchema).optional()
});

const ContactResultSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    tag_id: z.string().describe('ID of the tag'),
    tag_name: z.string().describe('Name of the tag'),
    untagged_contacts: z.array(ContactResultSchema).describe('Contacts that were untagged')
});

const action = createAction({
    description: 'Remove a tag from one or more contacts',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/untag-contacts',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:write', 'tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const users = input.contacts.map((contact) => ({
            untag: true,
            ...(contact.id && { id: contact.id }),
            ...(contact.email && { email: contact.email })
        }));

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags/
        const response = await nango.post({
            endpoint: '/tags',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: {
                name: input.tag_name,
                users: users
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        // Intercom returns empty users array after untagging (users are no longer associated)
        // Return the input contacts as confirmation they were processed
        const untaggedContacts = input.contacts.map((contact) => {
            const result: { id?: string; email?: string } = {};
            if (contact.id) {
                result.id = contact.id;
            }
            if (contact.email) {
                result.email = contact.email;
            }
            return result;
        });

        return {
            tag_id: providerData.id,
            tag_name: providerData.name,
            untagged_contacts: untaggedContacts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
