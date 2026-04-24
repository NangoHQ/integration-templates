import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The unique Xero identifier for the contact. Example: "00000000-0000-0000-0000-000000000000"'),
    name: z.string().optional().describe('Full name of the contact.'),
    firstName: z.string().optional().describe('First name of the contact (max 255 chars).'),
    lastName: z.string().optional().describe('Last name of the contact (max 255 chars).'),
    emailAddress: z.string().optional().describe('Email address of the contact.'),
    phoneNumber: z.string().optional().describe('Phone number for the contact.'),
    addressLine1: z.string().optional().describe('Street address line 1.'),
    addressLine2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City of the address.'),
    region: z.string().optional().describe('Region/state of the address.'),
    postalCode: z.string().optional().describe('Postal code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    accountNumber: z.string().optional().describe('Bank account number for the contact.'),
    taxNumber: z.string().optional().describe('Tax number of the contact.'),
    isCustomer: z.boolean().optional().describe('Whether the contact is a customer.'),
    isSupplier: z.boolean().optional().describe('Whether the contact is a supplier.'),
    defaultCurrency: z.string().optional().describe('Default currency code for the contact. Example: "USD"')
});

const OutputSchema = z.object({
    contactId: z.string(),
    name: z.union([z.string(), z.null()]),
    firstName: z.union([z.string(), z.null()]),
    lastName: z.union([z.string(), z.null()]),
    emailAddress: z.union([z.string(), z.null()]),
    phoneNumber: z.union([z.string(), z.null()]),
    accountNumber: z.union([z.string(), z.null()]),
    taxNumber: z.union([z.string(), z.null()]),
    isCustomer: z.union([z.boolean(), z.null()]),
    isSupplier: z.union([z.boolean(), z.null()]),
    defaultCurrency: z.union([z.string(), z.null()])
});

// Xero API response schemas
const XeroContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    BankAccountDetails: z.string().optional(),
    TaxNumber: z.string().optional(),
    IsCustomer: z.boolean().optional(),
    IsSupplier: z.boolean().optional(),
    DefaultCurrency: z.string().optional(),
    Phones: z.array(z.object({ PhoneType: z.string().optional(), PhoneNumber: z.string().optional() })).optional()
});

const XeroContactsResponseSchema = z.object({
    Contacts: z.array(XeroContactSchema)
});

// @allowTryCatch - needed because getConnection returns ApiPublicConnectionFull with nullable metadata
type ConnectionInfo = {
    connection_config?: Record<string, string> | null;
    metadata?: Record<string, unknown> | null;
};

function resolveTenantId(connection: ConnectionInfo): string | null {
    const config = connection.connection_config;
    if (config && config['tenant_id']) {
        return config['tenant_id'];
    }
    const meta = connection.metadata;
    if (meta && meta['tenantId'] && typeof meta['tenantId'] === 'string') {
        return meta['tenantId'];
    }
    return null;
}

const action = createAction({
    description: 'Update an existing contact in Xero.',
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

        let tenantId = resolveTenantId(connection);

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsSchema = z.array(z.object({ tenantId: z.string() }));
            const parsedConnections = connectionsSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid connections response from Xero API'
                });
            }

            const connections = parsedConnections.data;
            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }
            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            tenantId = connections[0]!.tenantId;

            if (!tenantId) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Could not resolve Xero tenant ID.'
                });
            }
        }

        const contactPayload: Record<string, unknown> = {
            ContactID: input.contactId
        };

        if (input.name !== undefined) {
            contactPayload['Name'] = input.name;
        }
        if (input.firstName !== undefined) {
            contactPayload['FirstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            contactPayload['LastName'] = input.lastName;
        }
        if (input.emailAddress !== undefined) {
            contactPayload['EmailAddress'] = input.emailAddress;
        }
        if (input.accountNumber !== undefined) {
            contactPayload['BankAccountDetails'] = input.accountNumber;
        }
        if (input.taxNumber !== undefined) {
            contactPayload['TaxNumber'] = input.taxNumber;
        }
        if (input.isCustomer !== undefined) {
            contactPayload['IsCustomer'] = input.isCustomer;
        }
        if (input.isSupplier !== undefined) {
            contactPayload['IsSupplier'] = input.isSupplier;
        }
        if (input.defaultCurrency !== undefined) {
            contactPayload['DefaultCurrency'] = input.defaultCurrency;
        }

        if (input.addressLine1 !== undefined || input.addressLine2 !== undefined || input.city !== undefined || input.region !== undefined || input.postalCode !== undefined || input.country !== undefined) {
            const address: Record<string, unknown> = {
                AddressType: 'POBOX'
            };
            if (input.addressLine1 !== undefined) {
                address['AddressLine1'] = input.addressLine1;
            }
            if (input.addressLine2 !== undefined) {
                address['AddressLine2'] = input.addressLine2;
            }
            if (input.city !== undefined) {
                address['City'] = input.city;
            }
            if (input.region !== undefined) {
                address['Region'] = input.region;
            }
            if (input.postalCode !== undefined) {
                address['PostalCode'] = input.postalCode;
            }
            if (input.country !== undefined) {
                address['Country'] = input.country;
            }
            contactPayload['Addresses'] = [address];
        }

        if (input.phoneNumber !== undefined) {
            contactPayload['Phones'] = [
                {
                    PhoneType: 'DEFAULT',
                    PhoneNumber: input.phoneNumber
                }
            ];
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

        const parsed = XeroContactsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Xero API response',
                details: parsed.error.message
            });
        }

        const contacts = parsed.data.Contacts;
        if (contacts.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No contact returned in response'
            });
        }

        const contact = contacts[0];
        if (!contact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found in response'
            });
        }

        return {
            contactId: contact.ContactID,
            name: contact.Name ?? null,
            firstName: contact.FirstName ?? null,
            lastName: contact.LastName ?? null,
            emailAddress: contact.EmailAddress ?? null,
            phoneNumber: contact.Phones?.find((p) => p.PhoneType === 'DEFAULT')?.PhoneNumber ?? null,
            accountNumber: contact.BankAccountDetails ?? null,
            taxNumber: contact.TaxNumber ?? null,
            isCustomer: contact.IsCustomer ?? null,
            isSupplier: contact.IsSupplier ?? null,
            defaultCurrency: contact.DefaultCurrency ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
