import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('SCIM User ID. Example: "2819c223-7f76-453a-919d-413861904646"')
});

const NameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional(),
    middleName: z.string().optional(),
    honorificPrefix: z.string().optional(),
    honorificSuffix: z.string().optional()
});

const EmailSchema = z.object({
    value: z.string().optional(),
    display: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const PhoneNumberSchema = z.object({
    value: z.string().optional(),
    display: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const AddressSchema = z.object({
    formatted: z.string().optional(),
    streetAddress: z.string().optional(),
    locality: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const GroupSchema = z.object({
    value: z.string().optional(),
    display: z.string().optional(),
    type: z.string().optional(),
    $ref: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    version: z.string().optional(),
    location: z.string().optional()
});

const ProviderUserSchema = z.looseObject({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    userName: z.string().optional(),
    name: NameSchema.optional(),
    displayName: z.string().optional(),
    nickName: z.string().optional(),
    profileUrl: z.string().optional(),
    title: z.string().optional(),
    userType: z.string().optional(),
    preferredLanguage: z.string().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    active: z.boolean().optional(),
    emails: z.array(EmailSchema).optional(),
    phoneNumbers: z.array(PhoneNumberSchema).optional(),
    ims: z
        .array(
            z.object({
                value: z.string().optional(),
                display: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    photos: z
        .array(
            z.object({
                value: z.string().optional(),
                display: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    addresses: z.array(AddressSchema).optional(),
    groups: z.array(GroupSchema).optional(),
    entitlements: z
        .array(
            z.object({
                value: z.string().optional(),
                display: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    roles: z
        .array(
            z.object({
                value: z.string().optional(),
                display: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    x509Certificates: z
        .array(
            z.object({
                value: z.string().optional(),
                display: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    meta: MetaSchema.optional()
});

const OutputSchema = ProviderUserSchema;

const action = createAction({
    description: 'Retrieve a single SCIM user from 1Password SCIM.',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                id: input.id
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);
        return providerUser;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
