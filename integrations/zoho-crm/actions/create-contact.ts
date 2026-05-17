import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    First_Name: z.string().optional().describe('First name of the contact. Example: "John"'),
    Last_Name: z.string().describe('Last name of the contact. Example: "Smith"'),
    Email: z.string().optional().describe('Email address of the contact. Example: "john.smith@example.com"'),
    Phone: z.string().optional().describe('Phone number of the contact. Example: "+1-555-0123"'),
    Mobile: z.string().optional().describe('Mobile number of the contact. Example: "+1-555-0456"'),
    Title: z.string().optional().describe('Job title of the contact. Example: "Sales Manager"'),
    Department: z.string().optional().describe('Department of the contact. Example: "Sales"'),
    Account_Name: z.string().optional().describe('Account name associated with the contact. Example: "Acme Inc."'),
    Mailing_Street: z.string().optional().describe('Mailing street address. Example: "123 Main St"'),
    Mailing_City: z.string().optional().describe('Mailing city. Example: "San Francisco"'),
    Mailing_State: z.string().optional().describe('Mailing state. Example: "California"'),
    Mailing_Country: z.string().optional().describe('Mailing country. Example: "USA"'),
    Mailing_Zip: z.string().optional().describe('Mailing zip code. Example: "94102"'),
    Description: z.string().optional().describe('Description or notes about the contact. Example: "Key decision maker"')
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z
                .object({
                    id: z.string().optional(),
                    Created_Time: z.string().optional(),
                    Modified_Time: z.string().optional(),
                    Created_By: z.unknown().optional(),
                    Modified_By: z.unknown().optional()
                })
                .passthrough(),
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    id: z.string().describe('Unique identifier of the created contact'),
    success: z.boolean().describe('Whether the contact was created successfully'),
    message: z.string().optional().describe('Status message from the API'),
    created_time: z.string().optional().describe('Timestamp when the contact was created')
});

const action = createAction({
    description: 'Create a contact in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.contacts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contactData: Record<string, string | undefined> = {
            Last_Name: input.Last_Name
        };

        if (input.First_Name !== undefined) {
            contactData['First_Name'] = input.First_Name;
        }
        if (input.Email !== undefined) {
            contactData['Email'] = input.Email;
        }
        if (input.Phone !== undefined) {
            contactData['Phone'] = input.Phone;
        }
        if (input.Mobile !== undefined) {
            contactData['Mobile'] = input.Mobile;
        }
        if (input.Title !== undefined) {
            contactData['Title'] = input.Title;
        }
        if (input.Department !== undefined) {
            contactData['Department'] = input.Department;
        }
        if (input.Account_Name !== undefined) {
            contactData['Account_Name'] = input.Account_Name;
        }
        if (input.Mailing_Street !== undefined) {
            contactData['Mailing_Street'] = input.Mailing_Street;
        }
        if (input.Mailing_City !== undefined) {
            contactData['Mailing_City'] = input.Mailing_City;
        }
        if (input.Mailing_State !== undefined) {
            contactData['Mailing_State'] = input.Mailing_State;
        }
        if (input.Mailing_Country !== undefined) {
            contactData['Mailing_Country'] = input.Mailing_Country;
        }
        if (input.Mailing_Zip !== undefined) {
            contactData['Mailing_Zip'] = input.Mailing_Zip;
        }
        if (input.Description !== undefined) {
            contactData['Description'] = input.Description;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/Contacts.html
        const response = await nango.post({
            endpoint: '/crm/v2/Contacts',
            data: {
                data: [contactData]
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (result === undefined) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'No response data from Zoho CRM'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: result.message,
                code: result.code
            });
        }

        if (result.details.id === undefined) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Contact was created but no ID was returned'
            });
        }

        return {
            id: result.details.id,
            success: result.status === 'success',
            message: result.message,
            created_time: result.details.Created_Time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
