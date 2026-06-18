import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    listId: z.number().describe('List ID. Example: 3'),
    contactId: z.number().describe('Contact ID. Example: 1'),
    status: z.number().describe('Subscription status. 1 = subscribe, 2 = unsubscribe.')
});

const ProviderContactListSchema = z.object({
    contactList: z.object({
        id: z.string(),
        contact: z.string(),
        list: z.string(),
        status: z.number(),
        sdate: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    contactId: z.string(),
    listId: z.string(),
    status: z.number(),
    subscribedDate: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

const action = createAction({
    description: 'Subscribe or unsubscribe a contact from an ActiveCampaign list.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/update-list-status-for-contact
        const response = await nango.post({
            endpoint: '/3/contactLists',
            data: {
                contactList: {
                    list: input.listId,
                    contact: input.contactId,
                    status: input.status
                }
            },
            retries: 3
        });

        const parsed = ProviderContactListSchema.parse(response.data);
        const contactList = parsed.contactList;

        return {
            id: contactList.id,
            contactId: contactList.contact,
            listId: contactList.list,
            status: contactList.status,
            ...(contactList.sdate !== undefined && { subscribedDate: contactList.sdate }),
            ...(contactList.first_name !== undefined && { firstName: contactList.first_name }),
            ...(contactList.last_name !== undefined && { lastName: contactList.last_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
