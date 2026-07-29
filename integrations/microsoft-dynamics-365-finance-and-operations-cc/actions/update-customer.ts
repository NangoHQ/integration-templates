import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    customerAccount: z.string().describe('Customer account number. Example: "DAT-000004"'),
    organizationName: z.string().optional().describe('Organization name. Example: "Acme Corp"'),
    nameAlias: z.string().optional().describe('Name alias. Example: "Acme"'),
    customerGroupId: z.string().optional().describe('Customer group ID. Example: "IG-CL"'),
    salesCurrencyCode: z.string().optional().describe('Sales currency code. Example: "USD"'),
    salesTaxGroup: z.string().optional().describe('Sales tax group. Example: "RFITAX"'),
    paymentTerms: z.string().optional().describe('Payment terms. Example: "RFI30"'),
    addressCity: z.string().optional().describe('City. Example: "New York"'),
    addressCountryRegionId: z.string().optional().describe('Country/region code. Example: "USA"'),
    addressZipCode: z.string().optional().describe('ZIP/postal code. Example: "10001"'),
    addressState: z.string().optional().describe('State. Example: "NY"'),
    addressStreet: z.string().optional().describe('Street address. Example: "123 Main St"'),
    primaryContactEmail: z.string().optional().describe('Primary contact email. Example: "contact@example.com"'),
    primaryContactPhone: z.string().optional().describe('Primary contact phone. Example: "+1-555-1234"'),
    languageId: z.string().optional().describe('Language ID. Example: "en-US"'),
    deliveryTerms: z.string().optional().describe('Delivery terms. Example: "FOB"'),
    deliveryMode: z.string().optional().describe('Delivery mode. Example: "Ground"'),
    creditLimit: z.number().optional().describe('Credit limit. Example: 10000'),
    onHoldStatus: z.enum(['No', 'Yes']).optional().describe('On-hold status. Example: "No"')
});

const ProviderCustomerSchema = z.object({
    dataAreaId: z.string(),
    CustomerAccount: z.string(),
    OrganizationName: z.string().optional(),
    NameAlias: z.string().optional(),
    CustomerGroupId: z.string().optional(),
    SalesCurrencyCode: z.string().optional(),
    SalesTaxGroup: z.string().optional(),
    PaymentTerms: z.string().optional(),
    AddressCity: z.string().optional(),
    AddressCountryRegionId: z.string().optional(),
    AddressZipCode: z.string().optional(),
    AddressState: z.string().optional(),
    AddressStreet: z.string().optional(),
    PrimaryContactEmail: z.string().optional(),
    PrimaryContactPhone: z.string().optional(),
    LanguageId: z.string().optional(),
    DeliveryTerms: z.string().optional(),
    DeliveryMode: z.string().optional(),
    CreditLimit: z.number().optional(),
    OnHoldStatus: z.string().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    customerAccount: z.string(),
    organizationName: z.string().optional(),
    nameAlias: z.string().optional(),
    customerGroupId: z.string().optional(),
    salesCurrencyCode: z.string().optional(),
    salesTaxGroup: z.string().optional(),
    paymentTerms: z.string().optional(),
    addressCity: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressState: z.string().optional(),
    addressStreet: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    primaryContactPhone: z.string().optional(),
    languageId: z.string().optional(),
    deliveryTerms: z.string().optional(),
    deliveryMode: z.string().optional(),
    creditLimit: z.number().optional(),
    onHoldStatus: z.string().optional()
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.organizationName !== undefined) {
            body['OrganizationName'] = input.organizationName;
        }
        if (input.nameAlias !== undefined) {
            body['NameAlias'] = input.nameAlias;
        }
        if (input.customerGroupId !== undefined) {
            body['CustomerGroupId'] = input.customerGroupId;
        }
        if (input.salesCurrencyCode !== undefined) {
            body['SalesCurrencyCode'] = input.salesCurrencyCode;
        }
        if (input.salesTaxGroup !== undefined) {
            body['SalesTaxGroup'] = input.salesTaxGroup;
        }
        if (input.paymentTerms !== undefined) {
            body['PaymentTerms'] = input.paymentTerms;
        }
        if (input.addressCity !== undefined) {
            body['AddressCity'] = input.addressCity;
        }
        if (input.addressCountryRegionId !== undefined) {
            body['AddressCountryRegionId'] = input.addressCountryRegionId;
        }
        if (input.addressZipCode !== undefined) {
            body['AddressZipCode'] = input.addressZipCode;
        }
        if (input.addressState !== undefined) {
            body['AddressState'] = input.addressState;
        }
        if (input.addressStreet !== undefined) {
            body['AddressStreet'] = input.addressStreet;
        }
        if (input.primaryContactEmail !== undefined) {
            body['PrimaryContactEmail'] = input.primaryContactEmail;
        }
        if (input.primaryContactPhone !== undefined) {
            body['PrimaryContactPhone'] = input.primaryContactPhone;
        }
        if (input.languageId !== undefined) {
            body['LanguageId'] = input.languageId;
        }
        if (input.deliveryTerms !== undefined) {
            body['DeliveryTerms'] = input.deliveryTerms;
        }
        if (input.deliveryMode !== undefined) {
            body['DeliveryMode'] = input.deliveryMode;
        }
        if (input.creditLimit !== undefined) {
            body['CreditLimit'] = input.creditLimit;
        }
        if (input.onHoldStatus !== undefined) {
            body['OnHoldStatus'] = input.onHoldStatus;
        }

        if (Object.keys(body).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields_to_update',
                message: 'No fields provided to update. Provide at least one optional field.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const patchResponse = await nango.patch({
            endpoint: `/data/CustomersV3(dataAreaId='${encodeURIComponent(input.dataAreaId)}',CustomerAccount='${encodeURIComponent(input.customerAccount)}')`,
            data: body,
            retries: 1
        });

        if (patchResponse.status !== 200 && patchResponse.status !== 204) {
            throw new nango.ActionError({
                type: 'patch_failed',
                message: `Customer update failed with status ${patchResponse.status}`,
                status: patchResponse.status
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const getResponse = await nango.get({
            endpoint: `/data/CustomersV3(dataAreaId='${encodeURIComponent(input.dataAreaId)}',CustomerAccount='${encodeURIComponent(input.customerAccount)}')`,
            retries: 3
        });

        const raw = getResponse.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'fetch_failed',
                message: 'Failed to fetch updated customer data'
            });
        }

        const providerCustomer = ProviderCustomerSchema.safeParse(raw);
        if (!providerCustomer.success) {
            throw new nango.ActionError({
                type: 'parse_failed',
                message: 'Failed to parse updated customer response',
                details: providerCustomer.error.issues
            });
        }

        const c = providerCustomer.data;

        return {
            dataAreaId: c.dataAreaId,
            customerAccount: c.CustomerAccount,
            ...(c.OrganizationName !== undefined && { organizationName: c.OrganizationName }),
            ...(c.NameAlias !== undefined && { nameAlias: c.NameAlias }),
            ...(c.CustomerGroupId !== undefined && { customerGroupId: c.CustomerGroupId }),
            ...(c.SalesCurrencyCode !== undefined && { salesCurrencyCode: c.SalesCurrencyCode }),
            ...(c.SalesTaxGroup !== undefined && { salesTaxGroup: c.SalesTaxGroup }),
            ...(c.PaymentTerms !== undefined && { paymentTerms: c.PaymentTerms }),
            ...(c.AddressCity !== undefined && { addressCity: c.AddressCity }),
            ...(c.AddressCountryRegionId !== undefined && { addressCountryRegionId: c.AddressCountryRegionId }),
            ...(c.AddressZipCode !== undefined && { addressZipCode: c.AddressZipCode }),
            ...(c.AddressState !== undefined && { addressState: c.AddressState }),
            ...(c.AddressStreet !== undefined && { addressStreet: c.AddressStreet }),
            ...(c.PrimaryContactEmail !== undefined && { primaryContactEmail: c.PrimaryContactEmail }),
            ...(c.PrimaryContactPhone !== undefined && { primaryContactPhone: c.PrimaryContactPhone }),
            ...(c.LanguageId !== undefined && { languageId: c.LanguageId }),
            ...(c.DeliveryTerms !== undefined && { deliveryTerms: c.DeliveryTerms }),
            ...(c.DeliveryMode !== undefined && { deliveryMode: c.DeliveryMode }),
            ...(c.CreditLimit !== undefined && { creditLimit: c.CreditLimit }),
            ...(c.OnHoldStatus !== undefined && { onHoldStatus: c.OnHoldStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
