import type { NangoAction } from '@nangohq/runner-sdk';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The unique identifier of the customer. Example: "1"'),
    SyncToken: z.string().describe('The version identifier for the customer. Required for concurrency control.'),
    realmId: z.string().optional().describe('Optional realmId override. Uses connection config realmId if not provided.'),
    sparse: z.boolean().optional().describe('Set to true for sparse update to send only changed fields.'),
    DisplayName: z.string().optional().describe('The display name of the customer.'),
    GivenName: z.string().optional().describe('The first name of the customer.'),
    FamilyName: z.string().optional().describe('The last name of the customer.'),
    MiddleName: z.string().optional().describe('The middle name of the customer.'),
    Suffix: z.string().optional().describe('The suffix of the customer (e.g., Jr., Sr., III).'),
    Title: z.string().optional().describe('The title of the customer (e.g., Mr., Mrs., Dr.).'),
    CompanyName: z.string().nullable().optional().describe('The company name associated with this customer. Use null to clear.'),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional()
        })
        .optional()
        .describe('The primary email address of the customer.'),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional()
        .describe('The primary phone number of the customer.'),
    Mobile: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional()
        .describe('The mobile phone number of the customer.'),
    Fax: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional()
        .describe('The fax number of the customer.'),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            Line2: z.string().nullable().optional(),
            Line3: z.string().nullable().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().nullable().optional(),
            Lat: z.string().nullable().optional(),
            Long: z.string().nullable().optional()
        })
        .optional()
        .describe('The billing address of the customer.'),
    ShipAddr: z
        .object({
            Line1: z.string().optional(),
            Line2: z.string().nullable().optional(),
            Line3: z.string().nullable().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().nullable().optional(),
            Lat: z.string().nullable().optional(),
            Long: z.string().nullable().optional()
        })
        .optional()
        .describe('The shipping address of the customer.'),
    Notes: z.string().nullable().optional().describe('Notes about this customer.'),
    Active: z.boolean().optional().describe('Whether the customer is active.'),
    Taxable: z.boolean().optional().describe('Whether the customer is taxable.'),
    CurrencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('The currency reference for this customer.')
});

const ProviderCustomerResponseSchema = z.object({
    Customer: z
        .object({
            Id: z.string(),
            SyncToken: z.string(),
            DisplayName: z.string().optional(),
            GivenName: z.string().optional(),
            FamilyName: z.string().optional(),
            MiddleName: z.string().optional(),
            Suffix: z.string().optional(),
            Title: z.string().optional(),
            CompanyName: z.string().optional(),
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
            Mobile: z
                .object({
                    FreeFormNumber: z.string().optional()
                })
                .optional(),
            Fax: z
                .object({
                    FreeFormNumber: z.string().optional()
                })
                .optional(),
            BillAddr: z
                .object({
                    Id: z.string().optional(),
                    Line1: z.string().optional(),
                    Line2: z.string().optional(),
                    Line3: z.string().optional(),
                    City: z.string().optional(),
                    CountrySubDivisionCode: z.string().optional(),
                    PostalCode: z.string().optional(),
                    Country: z.string().optional(),
                    Lat: z.string().optional(),
                    Long: z.string().optional()
                })
                .optional(),
            ShipAddr: z
                .object({
                    Id: z.string().optional(),
                    Line1: z.string().optional(),
                    Line2: z.string().optional(),
                    Line3: z.string().optional(),
                    City: z.string().optional(),
                    CountrySubDivisionCode: z.string().optional(),
                    PostalCode: z.string().optional(),
                    Country: z.string().optional(),
                    Lat: z.string().optional(),
                    Long: z.string().optional()
                })
                .optional(),
            Notes: z.string().optional(),
            Taxable: z.boolean().optional(),
            CurrencyRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            MetaData: z
                .object({
                    CreateTime: z.string().optional(),
                    LastUpdatedTime: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    middleName: z.string().optional(),
    suffix: z.string().optional(),
    title: z.string().optional(),
    companyName: z.string().optional(),
    active: z.boolean().optional(),
    primaryEmail: z.string().optional(),
    primaryPhone: z.string().optional(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    billingAddress: z
        .object({
            id: z.string().optional(),
            line1: z.string().optional(),
            line2: z.string().optional(),
            line3: z.string().optional(),
            city: z.string().optional(),
            countrySubDivisionCode: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional()
        })
        .optional(),
    shippingAddress: z
        .object({
            id: z.string().optional(),
            line1: z.string().optional(),
            line2: z.string().optional(),
            line3: z.string().optional(),
            city: z.string().optional(),
            countrySubDivisionCode: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional()
        })
        .optional(),
    notes: z.string().optional(),
    taxable: z.boolean().optional(),
    currencyRefValue: z.string().optional(),
    currencyRefName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

async function getCompany(nango: NangoAction, inputRealmId: string | undefined): Promise<string> {
    // Use explicit realmId from input if provided (useful for tests)
    if (inputRealmId && typeof inputRealmId === 'string') {
        return inputRealmId;
    }

    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];

    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration or input. Please reauthenticate to set the realmId.'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'Update a customer using its current SyncToken.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango, input.realmId);

        const requestBody: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken
        };

        if (input.sparse === true) {
            requestBody['sparse'] = true;
        }

        if (input.DisplayName !== undefined) {
            requestBody['DisplayName'] = input.DisplayName;
        }
        if (input.GivenName !== undefined) {
            requestBody['GivenName'] = input.GivenName;
        }
        if (input.FamilyName !== undefined) {
            requestBody['FamilyName'] = input.FamilyName;
        }
        if (input.MiddleName !== undefined) {
            requestBody['MiddleName'] = input.MiddleName;
        }
        if (input.Suffix !== undefined) {
            requestBody['Suffix'] = input.Suffix;
        }
        if (input.Title !== undefined) {
            requestBody['Title'] = input.Title;
        }
        if (input.CompanyName !== undefined) {
            requestBody['CompanyName'] = input.CompanyName;
        }
        if (input.PrimaryEmailAddr !== undefined) {
            requestBody['PrimaryEmailAddr'] = input.PrimaryEmailAddr;
        }
        if (input.PrimaryPhone !== undefined) {
            requestBody['PrimaryPhone'] = input.PrimaryPhone;
        }
        if (input.Mobile !== undefined) {
            requestBody['Mobile'] = input.Mobile;
        }
        if (input.Fax !== undefined) {
            requestBody['Fax'] = input.Fax;
        }
        if (input.BillAddr !== undefined) {
            requestBody['BillAddr'] = input.BillAddr;
        }
        if (input.ShipAddr !== undefined) {
            requestBody['ShipAddr'] = input.ShipAddr;
        }
        if (input.Notes !== undefined) {
            requestBody['Notes'] = input.Notes;
        }
        if (input.Active !== undefined) {
            requestBody['Active'] = input.Active;
        }
        if (input.Taxable !== undefined) {
            requestBody['Taxable'] = input.Taxable;
        }
        if (input.CurrencyRef !== undefined) {
            requestBody['CurrencyRef'] = input.CurrencyRef;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#update-a-customer
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/customer`,
            data: requestBody,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const parsed = ProviderCustomerResponseSchema.parse(response.data);
        const customer = parsed.Customer;

        if (!customer) {
            throw new nango.ActionError({
                type: 'customer_not_found',
                message: 'Customer not found in the response.'
            });
        }

        return {
            id: customer.Id,
            syncToken: customer.SyncToken,
            ...(customer.DisplayName !== undefined && { displayName: customer.DisplayName }),
            ...(customer.GivenName !== undefined && { givenName: customer.GivenName }),
            ...(customer.FamilyName !== undefined && { familyName: customer.FamilyName }),
            ...(customer.MiddleName !== undefined && { middleName: customer.MiddleName }),
            ...(customer.Suffix !== undefined && { suffix: customer.Suffix }),
            ...(customer.Title !== undefined && { title: customer.Title }),
            ...(customer.CompanyName !== undefined && { companyName: customer.CompanyName }),
            ...(customer.Active !== undefined && { active: customer.Active }),
            ...(customer.PrimaryEmailAddr?.Address !== undefined && { primaryEmail: customer.PrimaryEmailAddr.Address }),
            ...(customer.PrimaryPhone?.FreeFormNumber !== undefined && { primaryPhone: customer.PrimaryPhone.FreeFormNumber }),
            ...(customer.Mobile?.FreeFormNumber !== undefined && { mobile: customer.Mobile.FreeFormNumber }),
            ...(customer.Fax?.FreeFormNumber !== undefined && { fax: customer.Fax.FreeFormNumber }),
            ...(customer.BillAddr !== undefined && {
                billingAddress: {
                    ...(customer.BillAddr.Id !== undefined && { id: customer.BillAddr.Id }),
                    ...(customer.BillAddr.Line1 !== undefined && { line1: customer.BillAddr.Line1 }),
                    ...(customer.BillAddr.Line2 !== undefined && { line2: customer.BillAddr.Line2 }),
                    ...(customer.BillAddr.Line3 !== undefined && { line3: customer.BillAddr.Line3 }),
                    ...(customer.BillAddr.City !== undefined && { city: customer.BillAddr.City }),
                    ...(customer.BillAddr.CountrySubDivisionCode !== undefined && { countrySubDivisionCode: customer.BillAddr.CountrySubDivisionCode }),
                    ...(customer.BillAddr.PostalCode !== undefined && { postalCode: customer.BillAddr.PostalCode }),
                    ...(customer.BillAddr.Country !== undefined && { country: customer.BillAddr.Country }),
                    ...(customer.BillAddr.Lat !== undefined && { latitude: customer.BillAddr.Lat }),
                    ...(customer.BillAddr.Long !== undefined && { longitude: customer.BillAddr.Long })
                }
            }),
            ...(customer.ShipAddr !== undefined && {
                shippingAddress: {
                    ...(customer.ShipAddr.Id !== undefined && { id: customer.ShipAddr.Id }),
                    ...(customer.ShipAddr.Line1 !== undefined && { line1: customer.ShipAddr.Line1 }),
                    ...(customer.ShipAddr.Line2 !== undefined && { line2: customer.ShipAddr.Line2 }),
                    ...(customer.ShipAddr.Line3 !== undefined && { line3: customer.ShipAddr.Line3 }),
                    ...(customer.ShipAddr.City !== undefined && { city: customer.ShipAddr.City }),
                    ...(customer.ShipAddr.CountrySubDivisionCode !== undefined && { countrySubDivisionCode: customer.ShipAddr.CountrySubDivisionCode }),
                    ...(customer.ShipAddr.PostalCode !== undefined && { postalCode: customer.ShipAddr.PostalCode }),
                    ...(customer.ShipAddr.Country !== undefined && { country: customer.ShipAddr.Country }),
                    ...(customer.ShipAddr.Lat !== undefined && { latitude: customer.ShipAddr.Lat }),
                    ...(customer.ShipAddr.Long !== undefined && { longitude: customer.ShipAddr.Long })
                }
            }),
            ...(customer.Notes !== undefined && { notes: customer.Notes }),
            ...(customer.Taxable !== undefined && { taxable: customer.Taxable }),
            ...(customer.CurrencyRef?.value !== undefined && { currencyRefValue: customer.CurrencyRef.value }),
            ...(customer.CurrencyRef?.name !== undefined && { currencyRefName: customer.CurrencyRef.name }),
            ...(customer.MetaData?.CreateTime !== undefined && { createdAt: customer.MetaData.CreateTime }),
            ...(customer.MetaData?.LastUpdatedTime !== undefined && { updatedAt: customer.MetaData.LastUpdatedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
