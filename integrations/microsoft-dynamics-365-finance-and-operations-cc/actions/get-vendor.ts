import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    vendorAccountNumber: z.string().describe('Vendor account number. Example: "DAT-0000000002"')
});

const ProviderVendorSchema = z.object({
    dataAreaId: z.string().nullable().optional(),
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().nullable().optional(),
    VendorSearchName: z.string().nullable().optional(),
    VendorGroupId: z.string().nullable().optional(),
    AddressCity: z.string().nullable().optional(),
    AddressCountryRegionId: z.string().nullable().optional(),
    AddressStateId: z.string().nullable().optional(),
    AddressStreet: z.string().nullable().optional(),
    AddressZipCode: z.string().nullable().optional(),
    PrimaryEmailAddress: z.string().nullable().optional(),
    PrimaryPhoneNumber: z.string().nullable().optional(),
    CurrencyCode: z.string().nullable().optional(),
    LanguageId: z.string().nullable().optional(),
    SalesTaxGroupCode: z.string().nullable().optional(),
    DefaultPaymentTermsName: z.string().nullable().optional(),
    InvoiceVendorAccountNumber: z.string().nullable().optional(),
    OnHoldStatus: z.string().nullable().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string().optional(),
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().optional(),
    VendorSearchName: z.string().optional(),
    VendorGroupId: z.string().optional(),
    AddressCity: z.string().optional(),
    AddressCountryRegionId: z.string().optional(),
    AddressStateId: z.string().optional(),
    AddressStreet: z.string().optional(),
    AddressZipCode: z.string().optional(),
    PrimaryEmailAddress: z.string().optional(),
    PrimaryPhoneNumber: z.string().optional(),
    CurrencyCode: z.string().optional(),
    LanguageId: z.string().optional(),
    SalesTaxGroupCode: z.string().optional(),
    DefaultPaymentTermsName: z.string().optional(),
    InvoiceVendorAccountNumber: z.string().optional(),
    OnHoldStatus: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDataAreaId = encodeURIComponent(input.dataAreaId.replace(/'/g, "''"));
        const encodedVendorAccountNumber = encodeURIComponent(input.vendorAccountNumber.replace(/'/g, "''"));

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/VendorsV2(dataAreaId='${encodedDataAreaId}',VendorAccountNumber='${encodedVendorAccountNumber}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor not found',
                dataAreaId: input.dataAreaId,
                vendorAccountNumber: input.vendorAccountNumber
            });
        }

        const vendor = ProviderVendorSchema.parse(response.data);

        return {
            ...(vendor.dataAreaId != null && { dataAreaId: vendor.dataAreaId }),
            VendorAccountNumber: vendor.VendorAccountNumber,
            ...(vendor.VendorOrganizationName != null && { VendorOrganizationName: vendor.VendorOrganizationName }),
            ...(vendor.VendorSearchName != null && { VendorSearchName: vendor.VendorSearchName }),
            ...(vendor.VendorGroupId != null && { VendorGroupId: vendor.VendorGroupId }),
            ...(vendor.AddressCity != null && { AddressCity: vendor.AddressCity }),
            ...(vendor.AddressCountryRegionId != null && { AddressCountryRegionId: vendor.AddressCountryRegionId }),
            ...(vendor.AddressStateId != null && { AddressStateId: vendor.AddressStateId }),
            ...(vendor.AddressStreet != null && { AddressStreet: vendor.AddressStreet }),
            ...(vendor.AddressZipCode != null && { AddressZipCode: vendor.AddressZipCode }),
            ...(vendor.PrimaryEmailAddress != null && { PrimaryEmailAddress: vendor.PrimaryEmailAddress }),
            ...(vendor.PrimaryPhoneNumber != null && { PrimaryPhoneNumber: vendor.PrimaryPhoneNumber }),
            ...(vendor.CurrencyCode != null && { CurrencyCode: vendor.CurrencyCode }),
            ...(vendor.LanguageId != null && { LanguageId: vendor.LanguageId }),
            ...(vendor.SalesTaxGroupCode != null && { SalesTaxGroupCode: vendor.SalesTaxGroupCode }),
            ...(vendor.DefaultPaymentTermsName != null && { DefaultPaymentTermsName: vendor.DefaultPaymentTermsName }),
            ...(vendor.InvoiceVendorAccountNumber != null && { InvoiceVendorAccountNumber: vendor.InvoiceVendorAccountNumber }),
            ...(vendor.OnHoldStatus != null && { OnHoldStatus: vendor.OnHoldStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
