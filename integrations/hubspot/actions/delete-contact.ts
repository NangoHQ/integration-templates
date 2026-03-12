import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The ID of the contact to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    contact_id: z.string()
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
            endpoint: `/crm/v3/objects/contacts/${input.contact_id}`,
            retries: 10
        });

        return {
            success: true,
            contact_id: input.contact_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
