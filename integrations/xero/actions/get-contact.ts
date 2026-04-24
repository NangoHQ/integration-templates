import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The Xero ContactID to retrieve. Example: "8fecd03b-d211-491a-a3bb-7203920abac7"')
});

const AddressSchema = z.object({
    AddressType: z.string().nullish(),
    AddressLine1: z.string().nullish(),
    AddressLine2: z.string().nullish(),
    City: z.string().nullish(),
    Region: z.string().nullish(),
    PostalCode: z.string().nullish(),
    Country: z.string().nullish(),
    AttentionTo: z.string().nullish()
});

const PhoneSchema = z.object({
    PhoneType: z.string().nullish(),
    PhoneNumber: z.string().nullish(),
    PhoneAreaCode: z.string().nullish(),
    PhoneCountryCode: z.string().nullish()
});

const ContactPersonSchema = z.object({
    FirstName: z.string().nullish(),
    LastName: z.string().nullish(),
    EmailAddress: z.string().nullish(),
    IncludeInEmails: z.boolean().nullish()
});

const ContactGroupSchema = z.object({
    ContactGroupID: z.string().nullish(),
    Name: z.string().nullish(),
    Status: z.string().nullish()
});

const ContactSchema = z.object({
    ContactID: z.string(),
    ContactNumber: z.string().nullish(),
    AccountNumber: z.string().nullish(),
    ContactStatus: z.string().nullish(),
    Name: z.string(),
    FirstName: z.string().nullish(),
    LastName: z.string().nullish(),
    EmailAddress: z.string().nullish(),
    SkypeUserName: z.string().nullish(),
    ContactPersons: z.array(ContactPersonSchema).nullish(),
    BankAccountDetails: z.string().nullish(),
    TaxNumber: z.string().nullish(),
    AccountsReceivableTaxType: z.string().nullish(),
    AccountsPayableTaxType: z.string().nullish(),
    Addresses: z.array(AddressSchema).nullish(),
    Phones: z.array(PhoneSchema).nullish(),
    IsSupplier: z.boolean().nullish(),
    IsCustomer: z.boolean().nullish(),
    DefaultCurrency: z.string().nullish(),
    XeroNetworkKey: z.string().nullish(),
    DefaultSalesAccountCode: z.string().nullish(),
    DefaultPurchasesAccountCode: z.string().nullish(),
    SalesTrackingCategories: z.array(z.unknown()).nullish(),
    PurchasesTrackingCategories: z.array(z.unknown()).nullish(),
    TrackingCategoryName: z.string().nullish(),
    TrackingCategoryOption: z.string().nullish(),
    PaymentTerms: z.unknown().optional(),
    ContactGroups: z.array(ContactGroupSchema).nullish(),
    Website: z.string().nullish(),
    BatchPayments: z.unknown().optional(),
    Discount: z.number().nullish(),
    Balances: z.unknown().optional(),
    HasAttachments: z.boolean().nullish(),
    ValidationErrors: z.array(z.unknown()).nullish()
});

const OutputSchema = z.object({
    contact: ContactSchema
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
    scopes: ['accounting.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve tenant_id from connection config, metadata, or connections API
        // https://developer.xero.com/documentation/api/connections/overview
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && connection.connection_config !== null) {
            const config = connection.connection_config;
            if ('tenant_id' in config && typeof config['tenant_id'] === 'string') {
                tenantId = config['tenant_id'];
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && connection.metadata !== null) {
            const metadata = connection.metadata;
            if ('tenantId' in metadata && typeof metadata['tenantId'] === 'string') {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (connectionsResponse.data && Array.isArray(connectionsResponse.data) && connectionsResponse.data.length > 0) {
                if (connectionsResponse.data.length === 1) {
                    const firstConnection = connectionsResponse.data[0];
                    if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                        const maybeTenantId = firstConnection['tenantId'];
                        if (typeof maybeTenantId === 'string') {
                            tenantId = maybeTenantId;
                        }
                    }
                } else {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id from connection config, metadata, or connections API.'
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

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact not found for ContactID: ${input.contactId}`
            });
        }

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response data from Xero API'
            });
        }

        const data = response.data;

        if (!('Contacts' in data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact not found for ContactID: ${input.contactId}`
            });
        }

        const contactsValue = data.Contacts;

        if (!Array.isArray(contactsValue) || contactsValue.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact not found for ContactID: ${input.contactId}`
            });
        }

        const firstContact = contactsValue[0];

        if (!firstContact || typeof firstContact !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact not found for ContactID: ${input.contactId}`
            });
        }

        const parseResult = ContactSchema.safeParse(firstContact);

        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Contact data does not match expected schema'
            });
        }

        return {
            contact: parseResult.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
