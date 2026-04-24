import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    AddressType: z.string(),
    AddressLine1: z.string().optional(),
    AddressLine2: z.string().optional(),
    City: z.string().optional(),
    Region: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional()
});

const PhoneSchema = z.object({
    PhoneType: z.string(),
    PhoneNumber: z.string().optional(),
    PhoneAreaCode: z.string().optional(),
    PhoneCountryCode: z.string().optional()
});

const ContactPersonSchema = z.object({
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    IncludeInEmails: z.boolean().optional()
});

const InputSchema = z.object({
    Name: z.string().describe('Full name of the contact. Max length 255.'),
    ContactNumber: z.string().optional().describe('External identifier for the contact. Max length 50.'),
    AccountNumber: z.string().optional().describe('User defined account number.'),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    TaxNumber: z.string().optional(),
    BankAccountDetails: z.string().optional(),
    Website: z.string().optional(),
    IsCustomer: z.boolean().optional(),
    IsSupplier: z.boolean().optional(),
    DefaultCurrency: z.string().optional(),
    Addresses: z.array(AddressSchema).optional(),
    Phones: z.array(PhoneSchema).optional(),
    ContactPersons: z.array(ContactPersonSchema).optional()
});

const OutputSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string(),
    ContactNumber: z.string().optional(),
    AccountNumber: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    ContactStatus: z.string().optional(),
    IsCustomer: z.boolean().optional(),
    IsSupplier: z.boolean().optional()
});

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string(),
    ContactNumber: z.string().optional(),
    AccountNumber: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    ContactStatus: z.string().optional(),
    IsCustomer: z.boolean().optional(),
    IsSupplier: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    Contacts: z.array(z.unknown())
});

const ConnectionItemSchema = z.object({
    tenantId: z.string(),
    tenantName: z.string().optional()
});

const action = createAction({
    description: 'Create a contact in Xero.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts', 'accounting.transactions', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (
            connection.connection_config !== null &&
            connection.connection_config !== undefined &&
            typeof connection.connection_config === 'object' &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId) {
            if (
                connection.metadata !== null &&
                connection.metadata !== undefined &&
                typeof connection.metadata === 'object' &&
                'tenantId' in connection.metadata &&
                typeof connection.metadata['tenantId'] === 'string' &&
                connection.metadata['tenantId'].length > 0
            ) {
                tenantId = connection.metadata['tenantId'];
            }
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/connections
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(ConnectionItemSchema).parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenants',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (firstConnection === undefined) {
                throw new nango.ActionError({
                    type: 'no_tenants',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        const contactBody: Record<string, unknown> = {
            Name: input.Name
        };

        if (input.ContactNumber !== undefined) {
            contactBody['ContactNumber'] = input.ContactNumber;
        }
        if (input.AccountNumber !== undefined) {
            contactBody['AccountNumber'] = input.AccountNumber;
        }
        if (input.FirstName !== undefined) {
            contactBody['FirstName'] = input.FirstName;
        }
        if (input.LastName !== undefined) {
            contactBody['LastName'] = input.LastName;
        }
        if (input.EmailAddress !== undefined) {
            contactBody['EmailAddress'] = input.EmailAddress;
        }
        if (input.TaxNumber !== undefined) {
            contactBody['TaxNumber'] = input.TaxNumber;
        }
        if (input.BankAccountDetails !== undefined) {
            contactBody['BankAccountDetails'] = input.BankAccountDetails;
        }
        if (input.Website !== undefined) {
            contactBody['Website'] = input.Website;
        }
        if (input.IsCustomer !== undefined) {
            contactBody['IsCustomer'] = input.IsCustomer;
        }
        if (input.IsSupplier !== undefined) {
            contactBody['IsSupplier'] = input.IsSupplier;
        }
        if (input.DefaultCurrency !== undefined) {
            contactBody['DefaultCurrency'] = input.DefaultCurrency;
        }
        if (input.Addresses !== undefined) {
            contactBody['Addresses'] = input.Addresses;
        }
        if (input.Phones !== undefined) {
            contactBody['Phones'] = input.Phones;
        }
        if (input.ContactPersons !== undefined) {
            contactBody['ContactPersons'] = input.ContactPersons;
        }

        const response = await nango.put({
            // https://developer.xero.com/documentation/api/accounting/contacts
            endpoint: 'api.xro/2.0/Contacts',
            data: {
                Contacts: [contactBody]
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!Array.isArray(providerResponse.Contacts) || providerResponse.Contacts.length === 0) {
            throw new nango.ActionError({
                type: 'no_contact_returned',
                message: 'Xero did not return any contacts in the response.'
            });
        }

        const createdContact = ProviderContactSchema.parse(providerResponse.Contacts[0]);

        return {
            ContactID: createdContact.ContactID,
            Name: createdContact.Name,
            ...(createdContact.ContactNumber !== undefined && { ContactNumber: createdContact.ContactNumber }),
            ...(createdContact.AccountNumber !== undefined && { AccountNumber: createdContact.AccountNumber }),
            ...(createdContact.FirstName !== undefined && { FirstName: createdContact.FirstName }),
            ...(createdContact.LastName !== undefined && { LastName: createdContact.LastName }),
            ...(createdContact.EmailAddress !== undefined && { EmailAddress: createdContact.EmailAddress }),
            ...(createdContact.ContactStatus !== undefined && { ContactStatus: createdContact.ContactStatus }),
            ...(createdContact.IsCustomer !== undefined && { IsCustomer: createdContact.IsCustomer }),
            ...(createdContact.IsSupplier !== undefined && { IsSupplier: createdContact.IsSupplier })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
