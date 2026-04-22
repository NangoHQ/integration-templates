import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The unique Xero identifier for the contact. Example: "00000000-0000-0000-0000-000000000000"'),
    name: z.string().optional().describe('Full name of the contact.'),
    first_name: z.string().optional().describe('First name of the contact (max 255 chars).'),
    last_name: z.string().optional().describe('Last name of the contact (max 255 chars).'),
    email_address: z.string().optional().describe('Email address of the contact.'),
    phone_number: z.string().optional().describe('Phone number for the contact.'),
    address_line_1: z.string().optional().describe('Street address line 1.'),
    address_line_2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City of the address.'),
    region: z.string().optional().describe('Region/state of the address.'),
    postal_code: z.string().optional().describe('Postal code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    account_number: z.string().optional().describe('Bank account number for the contact.'),
    tax_number: z.string().optional().describe('Tax number of the contact.'),
    is_customer: z.boolean().optional().describe('Whether the contact is a customer.'),
    is_supplier: z.boolean().optional().describe('Whether the contact is a supplier.'),
    default_currency: z.string().optional().describe('Default currency code for the contact. Example: "USD"')
});

const OutputSchema = z.object({
    contact_id: z.string(),
    name: z.union([z.string(), z.null()]),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    email_address: z.union([z.string(), z.null()]),
    phone_number: z.union([z.string(), z.null()]),
    account_number: z.union([z.string(), z.null()]),
    tax_number: z.union([z.string(), z.null()]),
    is_customer: z.union([z.boolean(), z.null()]),
    is_supplier: z.union([z.boolean(), z.null()]),
    default_currency: z.union([z.string(), z.null()])
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
    DefaultCurrency: z.string().optional()
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

            const connectionsData = connectionsResponse.data;
            if (connectionsData && typeof connectionsData === 'object' && 'data' in connectionsData && Array.isArray(connectionsData.data)) {
                const connections = connectionsData.data;
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
                const firstConnection = connections[0];
                if (
                    firstConnection &&
                    typeof firstConnection === 'object' &&
                    'tenantId' in firstConnection &&
                    typeof firstConnection['tenantId'] === 'string'
                ) {
                    tenantId = firstConnection['tenantId'];
                }
            }

            if (!tenantId) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Could not resolve Xero tenant ID.'
                });
            }
        }

        const contactPayload: Record<string, unknown> = {
            ContactID: input.contact_id
        };

        if (input.name) {
            contactPayload['Name'] = input.name;
        }
        if (input.first_name) {
            contactPayload['FirstName'] = input.first_name;
        }
        if (input.last_name) {
            contactPayload['LastName'] = input.last_name;
        }
        if (input.email_address) {
            contactPayload['EmailAddress'] = input.email_address;
        }
        if (input.account_number) {
            contactPayload['BankAccountDetails'] = input.account_number;
        }
        if (input.tax_number) {
            contactPayload['TaxNumber'] = input.tax_number;
        }
        if (input.is_customer !== undefined) {
            contactPayload['IsCustomer'] = input.is_customer;
        }
        if (input.is_supplier !== undefined) {
            contactPayload['IsSupplier'] = input.is_supplier;
        }
        if (input.default_currency) {
            contactPayload['DefaultCurrency'] = input.default_currency;
        }

        if (input.address_line_1 || input.address_line_2 || input.city || input.region || input.postal_code || input.country) {
            const address: Record<string, unknown> = {
                AddressType: 'POBOX'
            };
            if (input.address_line_1) {
                address['AddressLine1'] = input.address_line_1;
            }
            if (input.address_line_2) {
                address['AddressLine2'] = input.address_line_2;
            }
            if (input.city) {
                address['City'] = input.city;
            }
            if (input.region) {
                address['Region'] = input.region;
            }
            if (input.postal_code) {
                address['PostalCode'] = input.postal_code;
            }
            if (input.country) {
                address['Country'] = input.country;
            }
            contactPayload['Addresses'] = [address];
        }

        if (input.phone_number) {
            contactPayload['Phones'] = [
                {
                    PhoneType: 'DEFAULT',
                    PhoneNumber: input.phone_number
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
            contact_id: contact.ContactID,
            name: contact.Name ?? null,
            first_name: contact.FirstName ?? null,
            last_name: contact.LastName ?? null,
            email_address: contact.EmailAddress ?? null,
            phone_number: input.phone_number ?? null,
            account_number: contact.BankAccountDetails ?? null,
            tax_number: contact.TaxNumber ?? null,
            is_customer: contact.IsCustomer ?? null,
            is_supplier: contact.IsSupplier ?? null,
            default_currency: contact.DefaultCurrency ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
