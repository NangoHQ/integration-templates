import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    AddressType: z.enum(['POBOX', 'STREET', 'DELIVERY']).optional(),
    AddressLine1: z.string().optional(),
    AddressLine2: z.string().optional(),
    City: z.string().optional(),
    Region: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional()
});

const PhoneSchema = z.object({
    PhoneType: z.enum(['DEFAULT', 'DDI', 'FAX', 'MOBILE']).optional(),
    PhoneNumber: z.string().optional(),
    PhoneAreaCode: z.string().optional(),
    PhoneCountryCode: z.string().optional()
});

const InputSchema = z.object({
    Name: z.string().describe('Full name of the contact. Example: "ABC Company"'),
    FirstName: z.string().optional().describe('First name of the contact person. Example: "John"'),
    LastName: z.string().optional().describe('Last name of the contact person. Example: "Smith"'),
    EmailAddress: z.string().optional().describe('Email address of the contact. Example: "john@example.com"'),
    ContactStatus: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Status of the contact. Defaults to ACTIVE.'),
    TaxNumber: z.string().optional().describe('Tax number of the contact.'),
    BankAccountDetails: z.string().optional().describe('Bank account details for the contact.'),
    AccountNumber: z.string().optional().describe('Account number for the contact.'),
    IsSupplier: z.boolean().optional().describe('Whether the contact is a supplier.'),
    IsCustomer: z.boolean().optional().describe('Whether the contact is a customer.'),
    Addresses: z.array(AddressSchema).optional().describe('List of addresses for the contact.'),
    Phones: z.array(PhoneSchema).optional().describe('List of phone numbers for the contact.')
});

const OutputSchema = z.object({
    ContactID: z.string(),
    Name: z.string(),
    FirstName: z.union([z.string(), z.null()]),
    LastName: z.union([z.string(), z.null()]),
    EmailAddress: z.union([z.string(), z.null()]),
    ContactStatus: z.string(),
    TaxNumber: z.union([z.string(), z.null()]),
    BankAccountDetails: z.union([z.string(), z.null()]),
    AccountNumber: z.union([z.string(), z.null()]),
    IsSupplier: z.boolean(),
    IsCustomer: z.boolean()
});

const TenantResponseSchema = z.object({
    data: z.array(
        z.object({
            tenantId: z.string(),
            tenantName: z.string().optional()
        })
    )
});

const ContactResponseSchema = z.object({
    Contacts: z.array(
        z.object({
            ContactID: z.string(),
            Name: z.string(),
            FirstName: z.union([z.string(), z.null()]).optional(),
            LastName: z.union([z.string(), z.null()]).optional(),
            EmailAddress: z.union([z.string(), z.null()]).optional(),
            ContactStatus: z.string(),
            TaxNumber: z.union([z.string(), z.null()]).optional(),
            BankAccountDetails: z.union([z.string(), z.null()]).optional(),
            AccountNumber: z.union([z.string(), z.null()]).optional(),
            IsSupplier: z.boolean().optional(),
            IsCustomer: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'Create a contact in Xero',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts', 'accounting.settings', 'accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // Resolve tenant_id per priority order:
        // 1. connection.connection_config['tenant_id']
        // 2. connection.metadata['tenantId']
        // 3. Call GET connections and use first tenant (only valid if exactly one)
        let tenantId: string | undefined;

        const connectionConfig = connection?.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
            const tenantIdValue = connectionConfig['tenant_id'];
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        if (!tenantId) {
            const metadata = connection?.metadata;
            if (metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
                const tenantIdValue = metadata['tenantId'];
                if (typeof tenantIdValue === 'string') {
                    tenantId = tenantIdValue;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = TenantResponseSchema.safeParse(connectionsResponse);
            if (!parsedConnections.success) {
                throw new Error('Failed to parse connections response');
            }

            const connections = parsedConnections.data.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            tenantId = connections[0]?.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'Unable to resolve Xero tenant ID'
            });
        }

        // Build the contact payload with only writable fields
        const contactPayload: Record<string, unknown> = {
            Name: input.Name
        };

        if (input.FirstName !== undefined) {
            contactPayload['FirstName'] = input.FirstName;
        }
        if (input.LastName !== undefined) {
            contactPayload['LastName'] = input.LastName;
        }
        if (input.EmailAddress !== undefined) {
            contactPayload['EmailAddress'] = input.EmailAddress;
        }
        if (input.ContactStatus !== undefined) {
            contactPayload['ContactStatus'] = input.ContactStatus;
        }
        if (input.TaxNumber !== undefined) {
            contactPayload['TaxNumber'] = input.TaxNumber;
        }
        if (input.BankAccountDetails !== undefined) {
            contactPayload['BankAccountDetails'] = input.BankAccountDetails;
        }
        if (input.AccountNumber !== undefined) {
            contactPayload['AccountNumber'] = input.AccountNumber;
        }
        if (input.IsSupplier !== undefined) {
            contactPayload['IsSupplier'] = input.IsSupplier;
        }
        if (input.IsCustomer !== undefined) {
            contactPayload['IsCustomer'] = input.IsCustomer;
        }
        if (input.Addresses !== undefined) {
            contactPayload['Addresses'] = input.Addresses;
        }
        if (input.Phones !== undefined) {
            contactPayload['Phones'] = input.Phones;
        }

        // https://developer.xero.com/documentation/api/accounting/contacts
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Contacts',
            data: {
                Contacts: [contactPayload]
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedResponse = ContactResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error('Failed to parse create contact response');
        }

        const contacts = parsedResponse.data.Contacts;
        if (!contacts || contacts.length === 0) {
            throw new nango.ActionError({
                type: 'no_contact_created',
                message: 'No contact was created in Xero'
            });
        }

        const contact = contacts[0];
        if (!contact) {
            throw new nango.ActionError({
                type: 'no_contact_created',
                message: 'No contact was created in Xero'
            });
        }

        return {
            ContactID: contact.ContactID,
            Name: contact.Name,
            FirstName: contact.FirstName ?? null,
            LastName: contact.LastName ?? null,
            EmailAddress: contact.EmailAddress ?? null,
            ContactStatus: contact.ContactStatus,
            TaxNumber: contact.TaxNumber ?? null,
            BankAccountDetails: contact.BankAccountDetails ?? null,
            AccountNumber: contact.AccountNumber ?? null,
            IsSupplier: contact.IsSupplier ?? false,
            IsCustomer: contact.IsCustomer ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
