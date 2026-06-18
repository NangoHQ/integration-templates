import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lastName: z.string().describe('Last name of the contact. Example: "Doe"'),
    firstName: z.string().optional().describe('First name of the contact. Example: "John"'),
    email: z.string().optional().describe('Email ID of the contact. Example: "john@example.com"'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    mobile: z.string().optional().describe('Mobile number of the contact.'),
    country: z.string().optional().describe('Contact country of residence.'),
    city: z.string().optional().describe('Contact city of residence.'),
    state: z.string().optional().describe('Contact state of residence.'),
    street: z.string().optional().describe('Contact street address.'),
    zip: z.string().optional().describe('Zip code.'),
    description: z.string().optional().describe('Contact description.'),
    title: z.string().optional().describe('Contact title.'),
    type: z.string().optional().describe('Contact type.'),
    ownerId: z.string().optional().describe('ID of the user who creates the contact.'),
    accountId: z.string().optional().describe('Account to which the contact is mapped.'),
    facebook: z.string().optional().describe('Facebook ID of the contact.'),
    twitter: z.string().optional().describe('Twitter ID of the contact.'),
    secondaryEmail: z.string().optional().describe('Secondary email ID of the contact.')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    lastName: z.string().nullish(),
    firstName: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    country: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    street: z.string().nullish(),
    zip: z.string().nullish(),
    description: z.string().nullish(),
    title: z.string().nullish(),
    type: z.string().nullish(),
    ownerId: z.string().nullish(),
    accountId: z.string().nullish(),
    facebook: z.string().nullish(),
    twitter: z.string().nullish(),
    secondaryEmail: z.string().nullish(),
    photoURL: z.string().nullish(),
    isDeleted: z.boolean().nullish(),
    isTrashed: z.boolean().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    zohoCRMContact: z
        .object({
            id: z.string(),
            type: z.string().nullish()
        })
        .nullish(),
    customerHappiness: z
        .object({
            badPercentage: z.string().nullish(),
            okPercentage: z.string().nullish(),
            goodPercentage: z.string().nullish()
        })
        .nullish(),
    isFollowing: z.union([z.string(), z.boolean()]).nullish(),
    isAnonymous: z.boolean().nullish(),
    webUrl: z.string().nullish(),
    isSpam: z.boolean().nullish(),
    cf: z.record(z.string(), z.unknown()).nullish()
});

const OutputSchema = z.object({
    id: z.string().describe('ID of the created contact.'),
    lastName: z.string().optional(),
    firstName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    street: z.string().optional(),
    zip: z.string().optional(),
    description: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    ownerId: z.string().optional(),
    accountId: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    secondaryEmail: z.string().optional(),
    photoURL: z.string().optional(),
    isDeleted: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    zohoCRMContact: z
        .object({
            id: z.string(),
            type: z.string().optional()
        })
        .optional(),
    customerHappiness: z
        .object({
            badPercentage: z.string().optional(),
            okPercentage: z.string().optional(),
            goodPercentage: z.string().optional()
        })
        .optional(),
    isFollowing: z.union([z.string(), z.boolean()]).optional(),
    isAnonymous: z.boolean().optional(),
    webUrl: z.string().optional(),
    isSpam: z.boolean().optional(),
    cf: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create a contact.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.contacts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            lastName: input.lastName
        };

        if (input.firstName !== undefined) {
            body['firstName'] = input.firstName;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.phone !== undefined) {
            body['phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            body['mobile'] = input.mobile;
        }
        if (input.country !== undefined) {
            body['country'] = input.country;
        }
        if (input.city !== undefined) {
            body['city'] = input.city;
        }
        if (input.state !== undefined) {
            body['state'] = input.state;
        }
        if (input.street !== undefined) {
            body['street'] = input.street;
        }
        if (input.zip !== undefined) {
            body['zip'] = input.zip;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.title !== undefined) {
            body['title'] = input.title;
        }
        if (input.type !== undefined) {
            body['type'] = input.type;
        }
        if (input.ownerId !== undefined) {
            body['ownerId'] = input.ownerId;
        }
        if (input.accountId !== undefined) {
            body['accountId'] = input.accountId;
        }
        if (input.facebook !== undefined) {
            body['facebook'] = input.facebook;
        }
        if (input.twitter !== undefined) {
            body['twitter'] = input.twitter;
        }
        if (input.secondaryEmail !== undefined) {
            body['secondaryEmail'] = input.secondaryEmail;
        }

        const connection = await nango.getConnection();
        const extension = typeof connection.connection_config?.['extension'] === 'string' ? connection.connection_config['extension'] : 'com';
        const baseUrlOverride = `https://desk.zoho.${extension}`;

        const response = await nango.post({
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/api/v1/contacts',
            data: body,
            retries: 10,
            baseUrlOverride
        });

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            ...(providerContact.lastName != null && { lastName: providerContact.lastName }),
            ...(providerContact.firstName != null && { firstName: providerContact.firstName }),
            ...(providerContact.email != null && { email: providerContact.email }),
            ...(providerContact.phone != null && { phone: providerContact.phone }),
            ...(providerContact.mobile != null && { mobile: providerContact.mobile }),
            ...(providerContact.country != null && { country: providerContact.country }),
            ...(providerContact.city != null && { city: providerContact.city }),
            ...(providerContact.state != null && { state: providerContact.state }),
            ...(providerContact.street != null && { street: providerContact.street }),
            ...(providerContact.zip != null && { zip: providerContact.zip }),
            ...(providerContact.description != null && { description: providerContact.description }),
            ...(providerContact.title != null && { title: providerContact.title }),
            ...(providerContact.type != null && { type: providerContact.type }),
            ...(providerContact.ownerId != null && { ownerId: providerContact.ownerId }),
            ...(providerContact.accountId != null && { accountId: providerContact.accountId }),
            ...(providerContact.facebook != null && { facebook: providerContact.facebook }),
            ...(providerContact.twitter != null && { twitter: providerContact.twitter }),
            ...(providerContact.secondaryEmail != null && { secondaryEmail: providerContact.secondaryEmail }),
            ...(providerContact.photoURL != null && { photoURL: providerContact.photoURL }),
            ...(providerContact.isDeleted != null && { isDeleted: providerContact.isDeleted }),
            ...(providerContact.isTrashed != null && { isTrashed: providerContact.isTrashed }),
            ...(providerContact.createdTime != null && { createdTime: providerContact.createdTime }),
            ...(providerContact.modifiedTime != null && { modifiedTime: providerContact.modifiedTime }),
            ...(providerContact.zohoCRMContact != null && {
                zohoCRMContact: {
                    id: providerContact.zohoCRMContact.id,
                    ...(providerContact.zohoCRMContact.type != null && { type: providerContact.zohoCRMContact.type })
                }
            }),
            ...(providerContact.customerHappiness != null && {
                customerHappiness: {
                    ...(providerContact.customerHappiness.badPercentage != null && { badPercentage: providerContact.customerHappiness.badPercentage }),
                    ...(providerContact.customerHappiness.okPercentage != null && { okPercentage: providerContact.customerHappiness.okPercentage }),
                    ...(providerContact.customerHappiness.goodPercentage != null && { goodPercentage: providerContact.customerHappiness.goodPercentage })
                }
            }),
            ...(providerContact.isFollowing != null && { isFollowing: providerContact.isFollowing }),
            ...(providerContact.isAnonymous != null && { isAnonymous: providerContact.isAnonymous }),
            ...(providerContact.webUrl != null && { webUrl: providerContact.webUrl }),
            ...(providerContact.isSpam != null && { isSpam: providerContact.isSpam }),
            ...(providerContact.cf != null && { cf: providerContact.cf })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
