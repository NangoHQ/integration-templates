import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the contact to update. Example: "3652397000003852095"'),
    Last_Name: z.string().optional().describe('Last name of the contact.'),
    First_Name: z.string().optional().describe('First name of the contact.'),
    Email: z.string().optional().describe('Email address of the contact.'),
    Phone: z.string().optional().describe('Phone number of the contact.'),
    Mobile: z.string().optional().describe('Mobile number of the contact.'),
    Title: z.string().optional().describe('Job title of the contact.'),
    Company: z.string().optional().describe('Company name associated with the contact.'),
    Department: z.string().optional().describe('Department of the contact.'),
    Fax: z.string().optional().describe('Fax number of the contact.'),
    Website: z.string().optional().describe('Website URL of the contact.'),
    Description: z.string().optional().describe('Description or notes about the contact.'),
    Street: z.string().optional().describe('Street address of the contact.'),
    City: z.string().optional().describe('City of the contact.'),
    State: z.string().optional().describe('State of the contact.'),
    Country: z.string().optional().describe('Country of the contact.'),
    Zip_Code: z.string().optional().describe('ZIP/Postal code of the contact.')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    Last_Name: z.string().optional(),
    First_Name: z.string().optional(),
    Email: z.string().optional(),
    Phone: z.string().optional(),
    Mobile: z.string().optional(),
    Title: z.string().optional(),
    Company: z.string().optional(),
    Department: z.string().optional(),
    Fax: z.string().optional(),
    Website: z.string().optional(),
    Description: z.string().optional(),
    Street: z.string().optional(),
    City: z.string().optional(),
    State: z.string().optional(),
    Country: z.string().optional(),
    Zip_Code: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    lastName: z.string().optional(),
    firstName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    department: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional()
});

const action = createAction({
    description: 'Update a contact in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.contacts.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.Last_Name !== undefined) {
            updateData['Last_Name'] = input.Last_Name;
        }
        if (input.First_Name !== undefined) {
            updateData['First_Name'] = input.First_Name;
        }
        if (input.Email !== undefined) {
            updateData['Email'] = input.Email;
        }
        if (input.Phone !== undefined) {
            updateData['Phone'] = input.Phone;
        }
        if (input.Mobile !== undefined) {
            updateData['Mobile'] = input.Mobile;
        }
        if (input.Title !== undefined) {
            updateData['Title'] = input.Title;
        }
        if (input.Company !== undefined) {
            updateData['Company'] = input.Company;
        }
        if (input.Department !== undefined) {
            updateData['Department'] = input.Department;
        }
        if (input.Fax !== undefined) {
            updateData['Fax'] = input.Fax;
        }
        if (input.Website !== undefined) {
            updateData['Website'] = input.Website;
        }
        if (input.Description !== undefined) {
            updateData['Description'] = input.Description;
        }
        if (input.Street !== undefined) {
            updateData['Street'] = input.Street;
        }
        if (input.City !== undefined) {
            updateData['City'] = input.City;
        }
        if (input.State !== undefined) {
            updateData['State'] = input.State;
        }
        if (input.Country !== undefined) {
            updateData['Country'] = input.Country;
        }
        if (input.Zip_Code !== undefined) {
            updateData['Zip_Code'] = input.Zip_Code;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-records.html
        const response = await nango.put({
            endpoint: `/crm/v2/Contacts/${input.id}`,
            data: {
                data: [updateData]
            },
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update contact',
                contactId: input.id
            });
        }

        const result = response.data.data[0];

        if (result.status === 'error') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.message || 'Failed to update contact',
                contactId: input.id,
                details: result.details
            });
        }

        const providerContact = ProviderContactSchema.parse(result.details);

        return {
            id: providerContact.id,
            ...(providerContact.Last_Name !== undefined && { lastName: providerContact.Last_Name }),
            ...(providerContact.First_Name !== undefined && { firstName: providerContact.First_Name }),
            ...(providerContact.Email !== undefined && { email: providerContact.Email }),
            ...(providerContact.Phone !== undefined && { phone: providerContact.Phone }),
            ...(providerContact.Mobile !== undefined && { mobile: providerContact.Mobile }),
            ...(providerContact.Title !== undefined && { title: providerContact.Title }),
            ...(providerContact.Company !== undefined && { company: providerContact.Company }),
            ...(providerContact.Department !== undefined && { department: providerContact.Department }),
            ...(providerContact.Fax !== undefined && { fax: providerContact.Fax }),
            ...(providerContact.Website !== undefined && { website: providerContact.Website }),
            ...(providerContact.Description !== undefined && { description: providerContact.Description }),
            ...(providerContact.Street !== undefined && { street: providerContact.Street }),
            ...(providerContact.City !== undefined && { city: providerContact.City }),
            ...(providerContact.State !== undefined && { state: providerContact.State }),
            ...(providerContact.Country !== undefined && { country: providerContact.Country }),
            ...(providerContact.Zip_Code !== undefined && { zipCode: providerContact.Zip_Code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
