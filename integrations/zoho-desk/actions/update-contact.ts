import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The ID of the contact to update. Example: "1329983000000410184"'),
    firstName: z.string().optional().describe('First name of the contact.'),
    lastName: z.string().optional().describe('Last name of the contact.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    mobile: z.string().optional().describe('Mobile number of the contact.'),
    secondaryEmail: z.string().optional().describe('Secondary email address of the contact.'),
    accountId: z.string().optional().describe('ID of the account associated with the contact.'),
    ownerId: z.string().optional().describe('ID of the agent who owns the contact.')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    mobile: z.string().nullable(),
    secondaryEmail: z.string().nullable(),
    accountId: z.string().nullable(),
    ownerId: z.string().nullable(),
    createdTime: z.string().nullable(),
    modifiedTime: z.string().nullable(),
    isAnonymous: z.boolean().nullable(),
    isSpam: z.boolean().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    secondaryEmail: z.string().optional(),
    accountId: z.string().optional(),
    ownerId: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    isAnonymous: z.boolean().optional(),
    isSpam: z.boolean().optional()
});

const action = createAction({
    description: 'Update a contact.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.contacts.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.firstName !== undefined) {
            data['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            data['lastName'] = input.lastName;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            data['mobile'] = input.mobile;
        }
        if (input.secondaryEmail !== undefined) {
            data['secondaryEmail'] = input.secondaryEmail;
        }
        if (input.accountId !== undefined) {
            data['accountId'] = input.accountId;
        }
        if (input.ownerId !== undefined) {
            data['ownerId'] = input.ownerId;
        }

        const response = await nango.patch({
            // https://desk.zoho.com/DeskAPIDocument#Contacts-UpdateContact
            endpoint: `/v1/contacts/${encodeURIComponent(input.contactId)}`,
            data,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or update failed.',
                contactId: input.contactId
            });
        }

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            ...(providerContact.firstName != null && { firstName: providerContact.firstName }),
            ...(providerContact.lastName != null && { lastName: providerContact.lastName }),
            ...(providerContact.email != null && { email: providerContact.email }),
            ...(providerContact.phone != null && { phone: providerContact.phone }),
            ...(providerContact.mobile != null && { mobile: providerContact.mobile }),
            ...(providerContact.secondaryEmail != null && { secondaryEmail: providerContact.secondaryEmail }),
            ...(providerContact.accountId != null && { accountId: providerContact.accountId }),
            ...(providerContact.ownerId != null && { ownerId: providerContact.ownerId }),
            ...(providerContact.createdTime != null && { createdTime: providerContact.createdTime }),
            ...(providerContact.modifiedTime != null && { modifiedTime: providerContact.modifiedTime }),
            ...(providerContact.isAnonymous != null && { isAnonymous: providerContact.isAnonymous }),
            ...(providerContact.isSpam != null && { isSpam: providerContact.isSpam })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
