import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('The unique ID of the contact to retrieve. Example: "4150868000001944196"')
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    Owner: OwnerSchema,
    Created_By: OwnerSchema,
    Modified_By: OwnerSchema,
    Created_Time: z.string(),
    Modified_Time: z.string(),
    First_Name: z.string().nullable().optional(),
    Last_Name: z.string().nullable().optional(),
    Full_Name: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Title: z.string().nullable().optional(),
    Department: z.string().nullable().optional(),
    Account_Name: z.string().nullable().optional(),
    Mailing_Street: z.string().nullable().optional(),
    Mailing_City: z.string().nullable().optional(),
    Mailing_State: z.string().nullable().optional(),
    Mailing_Zip: z.string().nullable().optional(),
    Mailing_Country: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    $approved: z.boolean(),
    $editable: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderContactSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    ownerId: z.string(),
    ownerName: z.string(),
    ownerEmail: z.string(),
    createdById: z.string(),
    createdByName: z.string(),
    createdTime: z.string(),
    modifiedById: z.string(),
    modifiedByName: z.string(),
    modifiedTime: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    accountName: z.string().optional(),
    mailingStreet: z.string().optional(),
    mailingCity: z.string().optional(),
    mailingState: z.string().optional(),
    mailingZip: z.string().optional(),
    mailingCountry: z.string().optional(),
    description: z.string().optional(),
    approved: z.boolean(),
    editable: z.boolean()
});

const action = createAction({
    description: 'Retrieve a single contact from Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.contacts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `/crm/v2/Contacts/${input.recordId}`,
            retries: 3
        });

        // Handle 204 No Content - contact not found
        if (response.status === 204 || response.data === null || response.data === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact with ID "${input.recordId}" not found`
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho CRM response',
                details: parsed.error.message
            });
        }

        const contacts = parsed.data.data;
        const contact = contacts[0];
        if (contact === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact with ID "${input.recordId}" not found`
            });
        }

        return {
            id: contact.id,
            ownerId: contact.Owner.id,
            ownerName: contact.Owner.name,
            ownerEmail: contact.Owner.email,
            createdById: contact.Created_By.id,
            createdByName: contact.Created_By.name,
            createdTime: contact.Created_Time,
            modifiedById: contact.Modified_By.id,
            modifiedByName: contact.Modified_By.name,
            modifiedTime: contact.Modified_Time,
            ...(contact.First_Name != null && { firstName: contact.First_Name }),
            ...(contact.Last_Name != null && { lastName: contact.Last_Name }),
            ...(contact.Full_Name != null && { fullName: contact.Full_Name }),
            ...(contact.Email != null && { email: contact.Email }),
            ...(contact.Phone != null && { phone: contact.Phone }),
            ...(contact.Mobile != null && { mobile: contact.Mobile }),
            ...(contact.Title != null && { title: contact.Title }),
            ...(contact.Department != null && { department: contact.Department }),
            ...(contact.Account_Name != null && { accountName: contact.Account_Name }),
            ...(contact.Mailing_Street != null && { mailingStreet: contact.Mailing_Street }),
            ...(contact.Mailing_City != null && { mailingCity: contact.Mailing_City }),
            ...(contact.Mailing_State != null && { mailingState: contact.Mailing_State }),
            ...(contact.Mailing_Zip != null && { mailingZip: contact.Mailing_Zip }),
            ...(contact.Mailing_Country != null && { mailingCountry: contact.Mailing_Country }),
            ...(contact.Description != null && { description: contact.Description }),
            approved: contact.$approved,
            editable: contact.$editable
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
