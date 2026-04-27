import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ContactID: z.string().describe('Xero identifier for the contact. Example: "eaa28f49-6028-4b6e-bb12-d8f6278073fc"'),
    ContactNumber: z.string().optional().describe('External system identifier (max 50).'),
    AccountNumber: z.string().optional().describe('User defined account number (max 50).'),
    ContactStatus: z.string().optional().describe('Current status of the contact, e.g. ACTIVE or ARCHIVED.'),
    Name: z.string().optional().describe('Full name of the contact or organisation (max 255).'),
    FirstName: z.string().optional().describe('First name of contact person (max 255).'),
    LastName: z.string().optional().describe('Last name of contact person (max 255).'),
    EmailAddress: z.string().optional().describe('Email address of contact person (max 255).'),
    BankAccountDetails: z.string().optional().describe('Bank account number.'),
    TaxNumber: z.string().optional().describe('Tax number of the contact.'),
    DefaultCurrency: z.string().optional().describe('Default currency for the contact, e.g. NZD.'),
    IsCustomer: z.boolean().optional().describe('Whether the contact is a customer.'),
    IsSupplier: z.boolean().optional().describe('Whether the contact is a supplier.'),
    Addresses: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of addresses.'),
    Phones: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of phone numbers.')
});

const OutputSchema = z.object({
    ContactID: z.string(),
    Name: z.string().optional(),
    ContactStatus: z.string().optional(),
    EmailAddress: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional()
});

const action = createAction({
    description: 'Update an existing contact.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
            const val = connectionConfig['tenant_id'];
            if (typeof val === 'string' && val.length > 0) {
                tenantId = val;
            }
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
                const val = metadata['tenantId'];
                if (typeof val === 'string' && val.length > 0) {
                    tenantId = val;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connectionsData = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);
            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No tenant found for this connection.'
                });
            }
            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const singleTenant = connectionsData[0];
            if (singleTenant && typeof singleTenant === 'object' && 'tenantId' in singleTenant) {
                const val = singleTenant['tenantId'];
                if (typeof val === 'string' && val.length > 0) {
                    tenantId = val;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'No tenant found for this connection.'
            });
        }

        const contactPayload: Record<string, unknown> = {
            ContactID: input.ContactID
        };

        if (input['ContactNumber'] !== undefined) {
            contactPayload['ContactNumber'] = input['ContactNumber'];
        }
        if (input['AccountNumber'] !== undefined) {
            contactPayload['AccountNumber'] = input['AccountNumber'];
        }
        if (input['ContactStatus'] !== undefined) {
            contactPayload['ContactStatus'] = input['ContactStatus'];
        }
        if (input['Name'] !== undefined) {
            contactPayload['Name'] = input['Name'];
        }
        if (input['FirstName'] !== undefined) {
            contactPayload['FirstName'] = input['FirstName'];
        }
        if (input['LastName'] !== undefined) {
            contactPayload['LastName'] = input['LastName'];
        }
        if (input['EmailAddress'] !== undefined) {
            contactPayload['EmailAddress'] = input['EmailAddress'];
        }
        if (input['BankAccountDetails'] !== undefined) {
            contactPayload['BankAccountDetails'] = input['BankAccountDetails'];
        }
        if (input['TaxNumber'] !== undefined) {
            contactPayload['TaxNumber'] = input['TaxNumber'];
        }
        if (input['DefaultCurrency'] !== undefined) {
            contactPayload['DefaultCurrency'] = input['DefaultCurrency'];
        }
        if (input['IsCustomer'] !== undefined) {
            contactPayload['IsCustomer'] = input['IsCustomer'];
        }
        if (input['IsSupplier'] !== undefined) {
            contactPayload['IsSupplier'] = input['IsSupplier'];
        }
        if (input['Addresses'] !== undefined) {
            contactPayload['Addresses'] = input['Addresses'];
        }
        if (input['Phones'] !== undefined) {
            contactPayload['Phones'] = input['Phones'];
        }

        // https://developer.xero.com/documentation/api/accounting/contacts
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Contacts: [contactPayload]
            },
            retries: 3
        });

        const responseSchema = z.object({
            Contacts: z.array(z.record(z.string(), z.unknown()))
        });

        const parsedResponse = responseSchema.parse(response.data);
        const contacts = parsedResponse.Contacts;
        if (!Array.isArray(contacts) || contacts.length === 0) {
            throw new nango.ActionError({
                type: 'no_contact_returned',
                message: 'No contact returned in the update response.'
            });
        }

        const updatedContact = contacts[0];

        const contactSchema = z.object({
            ContactID: z.string(),
            Name: z.string().optional(),
            ContactStatus: z.string().optional(),
            EmailAddress: z.string().optional(),
            FirstName: z.string().optional(),
            LastName: z.string().optional()
        });

        const parsedContact = contactSchema.parse(updatedContact);

        return {
            ContactID: parsedContact.ContactID,
            ...(parsedContact.Name !== undefined && { Name: parsedContact.Name }),
            ...(parsedContact.ContactStatus !== undefined && { ContactStatus: parsedContact.ContactStatus }),
            ...(parsedContact.EmailAddress !== undefined && { EmailAddress: parsedContact.EmailAddress }),
            ...(parsedContact.FirstName !== undefined && { FirstName: parsedContact.FirstName }),
            ...(parsedContact.LastName !== undefined && { LastName: parsedContact.LastName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
