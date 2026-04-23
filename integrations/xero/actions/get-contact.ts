import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The Xero ContactID to retrieve. Example: "8fecd03b-d211-491a-a3bb-7203920abac7"')
});

const AddressSchema = z.object({
    AddressType: z.string().optional(),
    AddressLine1: z.string().optional(),
    AddressLine2: z.string().optional(),
    City: z.string().optional(),
    Region: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional(),
    AttentionTo: z.string().optional()
});

const PhoneSchema = z.object({
    PhoneType: z.string().optional(),
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

const ContactGroupSchema = z.object({
    ContactGroupID: z.string().optional(),
    Name: z.string().optional(),
    Status: z.string().optional()
});

const ContactSchema = z.object({
    ContactID: z.string(),
    ContactNumber: z.string().optional(),
    AccountNumber: z.string().optional(),
    ContactStatus: z.string().optional(),
    Name: z.string(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().optional(),
    SkypeUserName: z.string().optional(),
    ContactPersons: z.array(ContactPersonSchema).optional(),
    BankAccountDetails: z.string().optional(),
    TaxNumber: z.string().optional(),
    AccountsReceivableTaxType: z.string().optional(),
    AccountsPayableTaxType: z.string().optional(),
    Addresses: z.array(AddressSchema).optional(),
    Phones: z.array(PhoneSchema).optional(),
    IsSupplier: z.boolean().optional(),
    IsCustomer: z.boolean().optional(),
    DefaultCurrency: z.string().optional(),
    XeroNetworkKey: z.string().optional(),
    DefaultSalesAccountCode: z.string().optional(),
    DefaultPurchasesAccountCode: z.string().optional(),
    SalesTrackingCategories: z.array(z.unknown()).optional(),
    PurchasesTrackingCategories: z.array(z.unknown()).optional(),
    TrackingCategoryName: z.string().optional(),
    TrackingCategoryOption: z.string().optional(),
    PaymentTerms: z.unknown().optional(),
    ContactGroups: z.array(ContactGroupSchema).optional(),
    Website: z.string().optional(),
    BatchPayments: z.unknown().optional(),
    Discount: z.number().optional(),
    Balances: z.unknown().optional(),
    HasAttachments: z.boolean().optional(),
    ValidationErrors: z.array(z.unknown()).optional()
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
