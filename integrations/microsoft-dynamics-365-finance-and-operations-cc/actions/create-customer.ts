import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / legal entity. Example: "dat"'),
    organizationName: z.string().describe('Organization name of the customer. Example: "Acme Corp"'),
    customerGroupId: z.string().describe('Customer group ID. Example: "IG-CL"'),
    salesCurrencyCode: z.string().describe('Sales currency code. Example: "USD"'),
    customerAccount: z.string().optional().describe('Customer account number. If omitted, the system assigns one. Example: "DAT-000042"'),
    addressCountryRegionId: z.string().optional().describe('Country/region ID for the primary address. Example: "USA"'),
    addressCity: z.string().optional().describe('City for the primary address. Example: "New York"'),
    addressStreet: z.string().optional().describe('Street address. Example: "123 Main St"'),
    addressZipCode: z.string().optional().describe('ZIP/postal code. Example: "10001"'),
    addressState: z.string().optional().describe('State. Example: "NY"'),
    salesTaxGroup: z.string().optional().describe('Sales tax group code. Example: "RFITAX"'),
    paymentTerms: z.string().optional().describe('Payment terms ID. Example: "RFI30"')
});

const OutputSchema = z.object({
    customerAccount: z.string(),
    organizationName: z.string(),
    customerGroupId: z.string(),
    salesCurrencyCode: z.string(),
    dataAreaId: z.string(),
    partyNumber: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    addressCity: z.string().optional(),
    addressStreet: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressState: z.string().optional(),
    salesTaxGroup: z.string().optional(),
    paymentTerms: z.string().optional()
});

const ProviderCustomerSchema = z
    .object({
        dataAreaId: z.string(),
        CustomerAccount: z.string(),
        OrganizationName: z.string(),
        CustomerGroupId: z.string(),
        SalesCurrencyCode: z.string(),
        PartyNumber: z.string().nullable().optional(),
        AddressCountryRegionId: z.string().nullable().optional(),
        AddressCity: z.string().nullable().optional(),
        AddressStreet: z.string().nullable().optional(),
        AddressZipCode: z.string().nullable().optional(),
        AddressState: z.string().nullable().optional(),
        SalesTaxGroup: z.string().nullable().optional(),
        PaymentTerms: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a customer.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomersV3',
            data: {
                dataAreaId: input.dataAreaId,
                OrganizationName: input.organizationName,
                CustomerGroupId: input.customerGroupId,
                SalesCurrencyCode: input.salesCurrencyCode,
                ...(input.customerAccount !== undefined && { CustomerAccount: input.customerAccount }),
                ...(input.addressCountryRegionId !== undefined && { AddressCountryRegionId: input.addressCountryRegionId }),
                ...(input.addressCity !== undefined && { AddressCity: input.addressCity }),
                ...(input.addressStreet !== undefined && { AddressStreet: input.addressStreet }),
                ...(input.addressZipCode !== undefined && { AddressZipCode: input.addressZipCode }),
                ...(input.addressState !== undefined && { AddressState: input.addressState }),
                ...(input.salesTaxGroup !== undefined && { SalesTaxGroup: input.salesTaxGroup }),
                ...(input.paymentTerms !== undefined && { PaymentTerms: input.paymentTerms })
            },
            retries: 1
        });

        const providerCustomer = ProviderCustomerSchema.parse(response.data);

        return {
            customerAccount: providerCustomer.CustomerAccount,
            organizationName: providerCustomer.OrganizationName,
            customerGroupId: providerCustomer.CustomerGroupId,
            salesCurrencyCode: providerCustomer.SalesCurrencyCode,
            dataAreaId: providerCustomer.dataAreaId,
            ...(providerCustomer.PartyNumber != null && providerCustomer.PartyNumber !== '' && { partyNumber: providerCustomer.PartyNumber }),
            ...(providerCustomer.AddressCountryRegionId != null &&
                providerCustomer.AddressCountryRegionId !== '' && { addressCountryRegionId: providerCustomer.AddressCountryRegionId }),
            ...(providerCustomer.AddressCity != null && providerCustomer.AddressCity !== '' && { addressCity: providerCustomer.AddressCity }),
            ...(providerCustomer.AddressStreet != null && providerCustomer.AddressStreet !== '' && { addressStreet: providerCustomer.AddressStreet }),
            ...(providerCustomer.AddressZipCode != null && providerCustomer.AddressZipCode !== '' && { addressZipCode: providerCustomer.AddressZipCode }),
            ...(providerCustomer.AddressState != null && providerCustomer.AddressState !== '' && { addressState: providerCustomer.AddressState }),
            ...(providerCustomer.SalesTaxGroup != null && providerCustomer.SalesTaxGroup !== '' && { salesTaxGroup: providerCustomer.SalesTaxGroup }),
            ...(providerCustomer.PaymentTerms != null && providerCustomer.PaymentTerms !== '' && { paymentTerms: providerCustomer.PaymentTerms })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
