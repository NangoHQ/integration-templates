import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Vendor ID. Example: "5"')
});

const CurrencyRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const AddressSchema = z.object({
    Id: z.string().optional(),
    Line1: z.string().optional(),
    Line2: z.string().optional(),
    City: z.string().optional(),
    Country: z.string().optional(),
    CountrySubDivisionCode: z.string().optional(),
    PostalCode: z.string().optional()
});

const PhoneSchema = z.object({
    FreeFormNumber: z.string().optional()
});

const EmailSchema = z.object({
    Address: z.string().optional()
});

const ProviderVendorSchema = z.object({
    Id: z.string(),
    DisplayName: z.string().optional(),
    CompanyName: z.string().optional(),
    PrintOnCheckName: z.string().optional(),
    Active: z.boolean().optional(),
    Balance: z.number().optional(),
    Vendor1099: z.boolean().optional(),
    BillAddr: AddressSchema.optional(),
    PrimaryPhone: PhoneSchema.optional(),
    PrimaryEmailAddr: EmailSchema.optional(),
    CurrencyRef: CurrencyRefSchema.optional(),
    MetaData: MetaDataSchema.optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    SyncToken: z.string().optional()
});

const ProviderResponseSchema = z.object({
    Vendor: ProviderVendorSchema
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    companyName: z.string().optional(),
    printOnCheckName: z.string().optional(),
    active: z.boolean().optional(),
    balance: z.number().optional(),
    vendor1099: z.boolean().optional(),
    billAddress: z
        .object({
            id: z.string().optional(),
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            countrySubDivisionCode: z.string().optional(),
            postalCode: z.string().optional()
        })
        .optional(),
    primaryPhone: z.string().optional(),
    primaryEmail: z.string().optional(),
    currencyCode: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

async function getCompany(nango: { getConnection: () => Promise<{ connection_config?: Record<string, string> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'Retrieve a vendor by ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/vendor/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse vendor response from QuickBooks',
                details: parsed.error.issues
            });
        }

        const vendor = parsed.data.Vendor;

        return {
            id: vendor.Id,
            ...(vendor.DisplayName !== undefined && { displayName: vendor.DisplayName }),
            ...(vendor.CompanyName !== undefined && { companyName: vendor.CompanyName }),
            ...(vendor.PrintOnCheckName !== undefined && { printOnCheckName: vendor.PrintOnCheckName }),
            ...(vendor.Active !== undefined && { active: vendor.Active }),
            ...(vendor.Balance !== undefined && { balance: vendor.Balance }),
            ...(vendor.Vendor1099 !== undefined && { vendor1099: vendor.Vendor1099 }),
            ...(vendor.BillAddr !== undefined && {
                billAddress: {
                    ...(vendor.BillAddr.Id !== undefined && { id: vendor.BillAddr.Id }),
                    ...(vendor.BillAddr.Line1 !== undefined && { line1: vendor.BillAddr.Line1 }),
                    ...(vendor.BillAddr.Line2 !== undefined && { line2: vendor.BillAddr.Line2 }),
                    ...(vendor.BillAddr.City !== undefined && { city: vendor.BillAddr.City }),
                    ...(vendor.BillAddr.Country !== undefined && { country: vendor.BillAddr.Country }),
                    ...(vendor.BillAddr.CountrySubDivisionCode !== undefined && {
                        countrySubDivisionCode: vendor.BillAddr.CountrySubDivisionCode
                    }),
                    ...(vendor.BillAddr.PostalCode !== undefined && { postalCode: vendor.BillAddr.PostalCode })
                }
            }),
            ...(vendor.PrimaryPhone?.FreeFormNumber !== undefined && {
                primaryPhone: vendor.PrimaryPhone.FreeFormNumber
            }),
            ...(vendor.PrimaryEmailAddr?.Address !== undefined && {
                primaryEmail: vendor.PrimaryEmailAddr.Address
            }),
            ...(vendor.CurrencyRef?.value !== undefined && { currencyCode: vendor.CurrencyRef.value }),
            ...(vendor.MetaData?.CreateTime !== undefined && { createdAt: vendor.MetaData.CreateTime }),
            ...(vendor.MetaData?.LastUpdatedTime !== undefined && {
                updatedAt: vendor.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
