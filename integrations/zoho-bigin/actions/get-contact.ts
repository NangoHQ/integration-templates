import { z } from 'zod';
import { createAction } from 'nango';

const CONTACT_FIELDS = [
    'id',
    'First_Name',
    'Last_Name',
    'Email',
    'Phone',
    'Mobile',
    'Title',
    'Department',
    'Mailing_Street',
    'Mailing_City',
    'Mailing_State',
    'Mailing_Zip',
    'Mailing_Country',
    'Description',
    'Tag',
    'Account_Name',
    'Owner',
    'Created_Time',
    'Modified_Time'
].join(',');

const InputSchema = z
    .object({
        record_id: z.string().describe('Bigin contact record ID to retrieve. Example: "7618134000000632028"')
    })
    .describe('Input for retrieving a single Bigin contact by its record ID.');

const LookupSchema = z.object({
    name: z.string(),
    id: z.string()
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().nullable().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    First_Name: z.string().nullable().optional(),
    Last_Name: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Title: z.string().nullable().optional(),
    Department: z.string().nullable().optional(),
    Mailing_Street: z.string().nullable().optional(),
    Mailing_City: z.string().nullable().optional(),
    Mailing_State: z.string().nullable().optional(),
    Mailing_Zip: z.string().nullable().optional(),
    Mailing_Country: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Tag: z.array(z.string()).nullable().optional(),
    Account_Name: LookupSchema.nullable().optional(),
    Owner: OwnerSchema.nullable().optional(),
    Created_Time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderContactSchema).min(1)
});

const OutputLookupSchema = z.object({
    name: z.string().describe('Display name of the linked record. Example: "Zylker Corp"'),
    id: z.string().describe('Record ID of the linked record. Example: "7618134000000632027"')
});

const OutputOwnerSchema = z.object({
    name: z.string().describe('Display name of the contact owner. Example: "Nango Developer"'),
    id: z.string().describe('Record ID of the contact owner. Example: "7618134000000627001"'),
    email: z.string().optional().describe('Email address of the contact owner. Example: "api@nango.dev"')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Bigin contact record ID. Example: "7618134000000632028"'),
        First_Name: z.string().optional().describe('Contact first name.'),
        Last_Name: z.string().optional().describe('Contact last name.'),
        Email: z.string().optional().describe('Primary email address of the contact.'),
        Phone: z.string().optional().describe('Primary phone number of the contact.'),
        Mobile: z.string().optional().describe('Mobile phone number of the contact.'),
        Title: z.string().optional().describe('Job title of the contact.'),
        Department: z.string().optional().describe('Department the contact belongs to.'),
        Mailing_Street: z.string().optional().describe('Street address of the contact.'),
        Mailing_City: z.string().optional().describe('City of the contact.'),
        Mailing_State: z.string().optional().describe('State of the contact.'),
        Mailing_Zip: z.string().optional().describe('Postal/ZIP code of the contact.'),
        Mailing_Country: z.string().optional().describe('Country of the contact.'),
        Description: z.string().optional().describe('Free-form description of the contact from Bigin.'),
        Tag: z.array(z.string()).optional().describe('Tags applied to the contact.'),
        Account_Name: OutputLookupSchema.optional().describe('Linked company (Account), with its name and ID.'),
        Owner: OutputOwnerSchema.optional().describe('Owner of the contact record, with name, ID and email.'),
        Created_Time: z.string().optional().describe('ISO 8601 timestamp when the contact was created. Example: "2026-10-07T03:21:34+03:00"'),
        Modified_Time: z.string().optional().describe('ISO 8601 timestamp when the contact was last modified. Example: "2026-10-07T03:21:34+03:00"')
    })
    .describe('A Bigin contact record including its core fields, linked company and owner.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing contact record from Bigin without mutating provider state.
 * @pitfalls: A missing, invalid, or deleted contact ID does not return a 404; the provider responds with an empty 204, which this action reports as a not_found error. Contact fields that have not been set are omitted from the returned object rather than returned as null.
 */
const action = createAction({
    description: 'Retrieve a single contact by its record ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/
        const response = await nango.get<unknown>({
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.record_id)}`,
            params: {
                fields: CONTACT_FIELDS
            },
            retries: 3
        });

        if (response.status === 204 || response.data === '' || response.data === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                record_id: input.record_id
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape while retrieving contact',
                record_id: input.record_id
            });
        }

        const contact = parsed.data.data[0];

        if (contact === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                record_id: input.record_id
            });
        }

        return {
            id: contact.id,
            ...(contact.First_Name != null && { First_Name: contact.First_Name }),
            ...(contact.Last_Name != null && { Last_Name: contact.Last_Name }),
            ...(contact.Email != null && { Email: contact.Email }),
            ...(contact.Phone != null && { Phone: contact.Phone }),
            ...(contact.Mobile != null && { Mobile: contact.Mobile }),
            ...(contact.Title != null && { Title: contact.Title }),
            ...(contact.Department != null && { Department: contact.Department }),
            ...(contact.Mailing_Street != null && { Mailing_Street: contact.Mailing_Street }),
            ...(contact.Mailing_City != null && { Mailing_City: contact.Mailing_City }),
            ...(contact.Mailing_State != null && { Mailing_State: contact.Mailing_State }),
            ...(contact.Mailing_Zip != null && { Mailing_Zip: contact.Mailing_Zip }),
            ...(contact.Mailing_Country != null && { Mailing_Country: contact.Mailing_Country }),
            ...(contact.Description != null && { Description: contact.Description }),
            ...(contact.Tag != null && { Tag: contact.Tag }),
            ...(contact.Account_Name != null && { Account_Name: contact.Account_Name }),
            ...(contact.Owner != null && {
                Owner: {
                    name: contact.Owner.name,
                    id: contact.Owner.id,
                    ...(contact.Owner.email != null && { email: contact.Owner.email })
                }
            }),
            ...(contact.Created_Time != null && { Created_Time: contact.Created_Time }),
            ...(contact.Modified_Time != null && { Modified_Time: contact.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
