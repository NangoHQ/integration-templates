import { z } from 'zod';
import { createAction } from 'nango';

const PhysicalAddressSchema = z.object({
    Line1: z.string().optional().describe('Address line 1. Example: "123 Main Street"'),
    Line2: z.string().optional().describe('Address line 2'),
    Line3: z.string().optional().describe('Address line 3'),
    City: z.string().optional().describe('City name. Example: "Mountain View"'),
    Country: z.string().optional().describe('Country name. Example: "USA"'),
    CountrySubDivisionCode: z.string().optional().describe('State or province code. Example: "CA"'),
    PostalCode: z.string().optional().describe('Postal code. Example: "94042"')
});

const EmailAddressSchema = z.object({
    Address: z.string().describe('Email address. Example: "customer@example.com"')
});

const PhoneNumberSchema = z.object({
    FreeFormNumber: z.string().describe('Phone number. Example: "(555) 555-5555"')
});

const InputSchema = z.object({
    DisplayName: z.string().describe('Display name for the customer. Example: "Acme Corp"'),
    GivenName: z.string().optional().describe('First name. Example: "John"'),
    MiddleName: z.string().optional().describe('Middle name'),
    FamilyName: z.string().optional().describe('Last name. Example: "Doe"'),
    Suffix: z.string().optional().describe('Name suffix. Example: "Jr", "Sr"'),
    CompanyName: z.string().optional().describe('Company name. Example: "Acme Corporation"'),
    PrimaryEmailAddr: EmailAddressSchema.optional().describe('Primary email address'),
    PrimaryPhone: PhoneNumberSchema.optional().describe('Primary phone number'),
    BillAddr: PhysicalAddressSchema.optional().describe('Billing address'),
    ShipAddr: PhysicalAddressSchema.optional().describe('Shipping address'),
    Notes: z.string().optional().describe('Additional notes about the customer')
});

const ReferenceSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const ProviderCustomerSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    DisplayName: z.string(),
    GivenName: z.string().optional(),
    MiddleName: z.string().optional(),
    FamilyName: z.string().optional(),
    Suffix: z.string().optional(),
    CompanyName: z.string().optional(),
    FullyQualifiedName: z.string().optional(),
    PrintOnCheckName: z.string().optional(),
    Active: z.boolean().optional(),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    BillAddr: PhysicalAddressSchema.optional(),
    ShipAddr: PhysicalAddressSchema.optional(),
    Notes: z.string().optional(),
    Balance: z.number().optional(),
    Taxable: z.boolean().optional(),
    Job: z.boolean().optional(),
    BillWithParent: z.boolean().optional(),
    PreferredDeliveryMethod: z.string().optional(),
    CurrencyRef: ReferenceSchema.optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional(),
    DefaultTaxCodeRef: ReferenceSchema.optional()
});

const ProviderResponseSchema = z.object({
    Customer: ProviderCustomerSchema
});

const OutputSchema = z.object({
    id: z.string().describe('Unique identifier for the customer'),
    displayName: z.string().describe('Display name of the customer'),
    givenName: z.string().optional().describe('First name'),
    middleName: z.string().optional().describe('Middle name'),
    familyName: z.string().optional().describe('Last name'),
    suffix: z.string().optional().describe('Name suffix'),
    companyName: z.string().optional().describe('Company name'),
    email: z.string().optional().describe('Primary email address'),
    phone: z.string().optional().describe('Primary phone number'),
    billingAddress: PhysicalAddressSchema.optional().describe('Billing address'),
    shippingAddress: PhysicalAddressSchema.optional().describe('Shipping address'),
    notes: z.string().optional().describe('Customer notes'),
    balance: z.number().optional().describe('Current balance'),
    active: z.boolean().optional().describe('Whether the customer is active'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
});

const action = createAction({
    description: 'Create a customer record in QuickBooks Online',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const requestBody: Record<string, unknown> = {
            DisplayName: input.DisplayName,
            ...(input.GivenName !== undefined && { GivenName: input.GivenName }),
            ...(input.MiddleName !== undefined && { MiddleName: input.MiddleName }),
            ...(input.FamilyName !== undefined && { FamilyName: input.FamilyName }),
            ...(input.Suffix !== undefined && { Suffix: input.Suffix }),
            ...(input.CompanyName !== undefined && { CompanyName: input.CompanyName }),
            ...(input.PrimaryEmailAddr !== undefined && { PrimaryEmailAddr: input.PrimaryEmailAddr }),
            ...(input.PrimaryPhone !== undefined && { PrimaryPhone: input.PrimaryPhone }),
            ...(input.BillAddr !== undefined && { BillAddr: input.BillAddr }),
            ...(input.ShipAddr !== undefined && { ShipAddr: input.ShipAddr }),
            ...(input.Notes !== undefined && { Notes: input.Notes })
        };

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/customer`,
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const customer = parsed.Customer;

        return {
            id: customer.Id,
            displayName: customer.DisplayName,
            ...(customer.GivenName !== undefined && { givenName: customer.GivenName }),
            ...(customer.MiddleName !== undefined && { middleName: customer.MiddleName }),
            ...(customer.FamilyName !== undefined && { familyName: customer.FamilyName }),
            ...(customer.Suffix !== undefined && { suffix: customer.Suffix }),
            ...(customer.CompanyName !== undefined && { companyName: customer.CompanyName }),
            ...(customer.PrimaryEmailAddr?.Address !== undefined && {
                email: customer.PrimaryEmailAddr.Address
            }),
            ...(customer.PrimaryPhone?.FreeFormNumber !== undefined && {
                phone: customer.PrimaryPhone.FreeFormNumber
            }),
            ...(customer.BillAddr !== undefined && { billingAddress: customer.BillAddr }),
            ...(customer.ShipAddr !== undefined && { shippingAddress: customer.ShipAddr }),
            ...(customer.Notes !== undefined && { notes: customer.Notes }),
            ...(customer.Balance !== undefined && { balance: customer.Balance }),
            ...(customer.Active !== undefined && { active: customer.Active }),
            ...(customer.MetaData?.CreateTime !== undefined && {
                createdAt: customer.MetaData.CreateTime
            }),
            ...(customer.MetaData?.LastUpdatedTime !== undefined && {
                updatedAt: customer.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
