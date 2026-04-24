import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Xero Contact ID. Example: "ba205489-48cf-484b-9781-d52d493bxxxxx"')
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const XeroTenantSchema = z.object({
    tenantId: z.string()
});

const ProviderAddressSchema = z.object({
    AddressType: z.string().optional(),
    City: z.string().optional(),
    Region: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional(),
    AttentionTo: z.string().optional(),
    AddressLine1: z.string().optional(),
    AddressLine2: z.string().optional(),
    AddressLine3: z.string().optional(),
    AddressLine4: z.string().optional()
});

const ProviderPhoneSchema = z.object({
    PhoneType: z.string().optional(),
    PhoneNumber: z.string().optional(),
    PhoneAreaCode: z.string().optional(),
    PhoneCountryCode: z.string().optional()
});

const ProviderContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string(),
    ContactNumber: z.string().optional(),
    AccountNumber: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    SkypeUserName: z.string().optional(),
    BankAccountDetails: z.string().optional(),
    TaxNumber: z.string().optional(),
    AccountsReceivableTaxType: z.string().optional(),
    AccountsPayableTaxType: z.string().optional(),
    IsSupplier: z.boolean().optional(),
    IsCustomer: z.boolean().optional(),
    DefaultCurrency: z.string().optional(),
    Addresses: z.array(ProviderAddressSchema).optional(),
    Phones: z.array(ProviderPhoneSchema).optional()
});

const ProviderContactsResponseSchema = z.object({
    Contacts: z.array(ProviderContactSchema)
});

const OutputSchema = z.object({
    contactId: z.string(),
    name: z.string(),
    contactNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    emailAddress: z.string().optional(),
    skypeUserName: z.string().optional(),
    bankAccountDetails: z.string().optional(),
    taxNumber: z.string().optional(),
    accountsReceivableTaxType: z.string().optional(),
    accountsPayableTaxType: z.string().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    defaultCurrency: z.string().optional(),
    addresses: z
        .array(
            z.object({
                addressType: z.string().optional(),
                city: z.string().optional(),
                region: z.string().optional(),
                postalCode: z.string().optional(),
                country: z.string().optional(),
                attentionTo: z.string().optional(),
                addressLine1: z.string().optional(),
                addressLine2: z.string().optional(),
                addressLine3: z.string().optional(),
                addressLine4: z.string().optional()
            })
        )
        .optional(),
    phones: z
        .array(
            z.object({
                phoneType: z.string().optional(),
                phoneNumber: z.string().optional(),
                phoneAreaCode: z.string().optional(),
                phoneCountryCode: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a contact by ContactID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts', 'accounting.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawConnection = await nango.getConnection();
        const connection = ConnectionSchema.parse(rawConnection);

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
            tenantId = connection.connection_config['tenant_id'];
        }
        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
            tenantId = connection.metadata['tenantId'];
        }
        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connectionsArray = z.array(XeroTenantSchema).parse(connectionsResponse.data);
            const [firstConnection] = connectionsArray;
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }
            if (connectionsArray.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve Xero tenant ID.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/contacts
        const response = await nango.get({
            endpoint: `api.xro/2.0/Contacts/${input.contactId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedResponse = ProviderContactsResponseSchema.parse(response.data);
        const [firstContact] = parsedResponse.Contacts;
        if (!firstContact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact with ID ${input.contactId} not found.`
            });
        }

        const contact = firstContact;

        return {
            contactId: contact.ContactID,
            name: contact.Name,
            ...(contact.ContactNumber !== undefined && { contactNumber: contact.ContactNumber }),
            ...(contact.AccountNumber !== undefined && { accountNumber: contact.AccountNumber }),
            ...(contact.FirstName !== undefined && { firstName: contact.FirstName }),
            ...(contact.LastName !== undefined && { lastName: contact.LastName }),
            ...(contact.EmailAddress !== undefined && { emailAddress: contact.EmailAddress }),
            ...(contact.SkypeUserName !== undefined && { skypeUserName: contact.SkypeUserName }),
            ...(contact.BankAccountDetails !== undefined && { bankAccountDetails: contact.BankAccountDetails }),
            ...(contact.TaxNumber !== undefined && { taxNumber: contact.TaxNumber }),
            ...(contact.AccountsReceivableTaxType !== undefined && { accountsReceivableTaxType: contact.AccountsReceivableTaxType }),
            ...(contact.AccountsPayableTaxType !== undefined && { accountsPayableTaxType: contact.AccountsPayableTaxType }),
            ...(contact.IsSupplier !== undefined && { isSupplier: contact.IsSupplier }),
            ...(contact.IsCustomer !== undefined && { isCustomer: contact.IsCustomer }),
            ...(contact.DefaultCurrency !== undefined && { defaultCurrency: contact.DefaultCurrency }),
            ...(contact.Addresses !== undefined && {
                addresses: contact.Addresses.map((address) => ({
                    ...(address.AddressType !== undefined && { addressType: address.AddressType }),
                    ...(address.City !== undefined && { city: address.City }),
                    ...(address.Region !== undefined && { region: address.Region }),
                    ...(address.PostalCode !== undefined && { postalCode: address.PostalCode }),
                    ...(address.Country !== undefined && { country: address.Country }),
                    ...(address.AttentionTo !== undefined && { attentionTo: address.AttentionTo }),
                    ...(address.AddressLine1 !== undefined && { addressLine1: address.AddressLine1 }),
                    ...(address.AddressLine2 !== undefined && { addressLine2: address.AddressLine2 }),
                    ...(address.AddressLine3 !== undefined && { addressLine3: address.AddressLine3 }),
                    ...(address.AddressLine4 !== undefined && { addressLine4: address.AddressLine4 })
                }))
            }),
            ...(contact.Phones !== undefined && {
                phones: contact.Phones.map((phone) => ({
                    ...(phone.PhoneType !== undefined && { phoneType: phone.PhoneType }),
                    ...(phone.PhoneNumber !== undefined && { phoneNumber: phone.PhoneNumber }),
                    ...(phone.PhoneAreaCode !== undefined && { phoneAreaCode: phone.PhoneAreaCode }),
                    ...(phone.PhoneCountryCode !== undefined && { phoneCountryCode: phone.PhoneCountryCode })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
