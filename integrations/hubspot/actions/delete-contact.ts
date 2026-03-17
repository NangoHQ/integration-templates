import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The ID of the contact to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    contactId: z.string()
});

const action = createAction({
    description: 'Delete a contact record',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-contact',
        group: 'Contacts'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/contacts#delete-contacts
        await nango.delete({
            endpoint: `/crm/v3/objects/contacts/${input.contactId}`,
            retries: 3
        });

        return {
            success: true,
            contactId: input.contactId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
