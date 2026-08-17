import { z } from 'zod';
import { createAction } from 'nango';

const PhoneSchema = z.object({
    PhoneType: z.string().describe('The type of phone number. Example: "DEFAULT", "DDI", "MOBILE", "FAX"'),
    PhoneNumber: z.string().optional().describe('The phone number.'),
    PhoneAreaCode: z.string().optional().describe('The area code of the phone number.'),
    PhoneCountryCode: z.string().optional().describe('The country code of the phone number.')
});

const AddressSchema = z.object({
    AddressType: z.string().describe('The type of address. Example: "STREET", "POBOX", "DELIVERY"'),
    AttentionTo: z.string().optional().describe('The attention line for the address.'),
    AddressLine1: z.string().optional().describe('The first line of the address.'),
    AddressLine2: z.string().optional().describe('The second line of the address.'),
    AddressLine3: z.string().optional().describe('The third line of the address.'),
    City: z.string().optional().describe('The city of the address.'),
    Region: z.string().optional().describe('The region or state of the address.'),
    PostalCode: z.string().optional().describe('The postal or ZIP code of the address.'),
    Country: z.string().optional().describe('The country of the address.')
});

const InputSchema = z
    .object({
        contactId: z.string().describe('The Xero ContactID of the contact to update. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        name: z.string().optional().describe('The full display name of the contact.'),
        firstName: z.string().optional().describe('The first name of the contact (for person contacts).'),
        lastName: z.string().optional().describe('The last name of the contact (for person contacts).'),
        emailAddress: z.string().optional().describe('The primary email address of the contact.'),
        accountNumber: z.string().optional().describe('The account number assigned to the contact.'),
        contactNumber: z.string().optional().describe('The external system identifier for the contact.'),
        contactStatus: z.string().optional().describe('The status of the contact. Valid values: "ACTIVE", "ARCHIVED".'),
        bankAccountDetails: z.string().optional().describe('The bank account details for the contact.'),
        taxNumber: z.string().optional().describe('The tax number for the contact.'),
        defaultCurrency: z.string().optional().describe('The default currency for the contact. Example: "USD"'),
        addresses: z.array(AddressSchema).optional().describe('The addresses to set for the contact.'),
        phones: z.array(PhoneSchema).optional().describe('The phone numbers to set for the contact.')
    })
    .describe('Input fields for updating an existing Xero contact.');

const OutputSchema = z
    .object({
        ContactID: z.string().describe('The unique identifier for the contact.'),
        ContactNumber: z.string().optional().describe('The contact number.'),
        AccountNumber: z.string().optional().describe('The account number assigned to the contact.'),
        ContactStatus: z.string().describe('The current status of the contact. Example: "ACTIVE", "ARCHIVED".'),
        Name: z.string().describe('The full display name of the contact.'),
        FirstName: z.string().optional().describe('The first name of the contact.'),
        LastName: z.string().optional().describe('The last name of the contact.'),
        EmailAddress: z.string().optional().describe('The primary email address of the contact.'),
        BankAccountDetails: z.string().optional().describe('The bank account details for the contact.'),
        TaxNumber: z.string().optional().describe('The tax number for the contact.'),
        AccountsReceivableTaxType: z.string().optional().describe('The default tax type for accounts receivable.'),
        AccountsPayableTaxType: z.string().optional().describe('The default tax type for accounts payable.'),
        Addresses: z.array(AddressSchema).optional().describe('The addresses associated with the contact.'),
        Phones: z.array(PhoneSchema).optional().describe('The phone numbers associated with the contact.'),
        UpdatedDateUTC: z.string().describe('The UTC timestamp when the contact was last updated.'),
        IsSupplier: z.boolean().optional().describe('Whether the contact is tracked as a supplier.'),
        IsCustomer: z.boolean().optional().describe('Whether the contact is tracked as a customer.'),
        DefaultCurrency: z.string().optional().describe('The default currency for the contact.')
    })
    .describe('The updated Xero contact returned by the API.');

const ConnectionItemSchema = z.object({
    tenantId: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing contact in Xero via POST /Contacts.
 * @pitfalls: Archiving a contact by setting ContactStatus to ARCHIVED freezes it; subsequent update attempts on an already-archived contact return a 400 error.
 */
const action = createAction({
    description: 'Update an existing contact.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig !== null && connectionConfig !== undefined && typeof connectionConfig === 'object' && !Array.isArray(connectionConfig)) {
            if ('tenant_id' in connectionConfig) {
                const candidate = connectionConfig['tenant_id'];
                if (typeof candidate === 'string' && candidate.length > 0) {
                    tenantId = candidate;
                }
            }
        }

        if (tenantId === undefined) {
            const metadata = connection.metadata;
            if (metadata !== null && metadata !== undefined && typeof metadata === 'object' && !Array.isArray(metadata)) {
                if ('tenantId' in metadata) {
                    const candidate = metadata['tenantId'];
                    if (typeof candidate === 'string' && candidate.length > 0) {
                        tenantId = candidate;
                    }
                }
            }
        }

        if (tenantId === undefined) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const response = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = response.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = ConnectionItemSchema.safeParse(rawConnections[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (tenantId === undefined) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const body: Record<string, unknown> = {
            Contacts: [
                {
                    ContactID: input.contactId,
                    ...(input.name !== undefined && { Name: input.name }),
                    ...(input.firstName !== undefined && { FirstName: input.firstName }),
                    ...(input.lastName !== undefined && { LastName: input.lastName }),
                    ...(input.emailAddress !== undefined && { EmailAddress: input.emailAddress }),
                    ...(input.accountNumber !== undefined && { AccountNumber: input.accountNumber }),
                    ...(input.contactNumber !== undefined && { ContactNumber: input.contactNumber }),
                    ...(input.contactStatus !== undefined && { ContactStatus: input.contactStatus }),
                    ...(input.bankAccountDetails !== undefined && { BankAccountDetails: input.bankAccountDetails }),
                    ...(input.taxNumber !== undefined && { TaxNumber: input.taxNumber }),
                    ...(input.defaultCurrency !== undefined && { DefaultCurrency: input.defaultCurrency }),
                    ...(input.addresses !== undefined && { Addresses: input.addresses }),
                    ...(input.phones !== undefined && { Phones: input.phones })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: body,
            retries: 3
        });

        const ResponseSchema = z.object({
            Contacts: z.array(z.unknown())
        });

        const parsedResponse = ResponseSchema.parse(response.data);

        if (!Array.isArray(parsedResponse.Contacts) || parsedResponse.Contacts.length === 0) {
            throw new nango.ActionError({
                type: 'no_contact_returned',
                message: 'The Xero API did not return any contact data after the update.'
            });
        }

        const rawContact = parsedResponse.Contacts[0];
        const contact = OutputSchema.parse(rawContact);

        return contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
