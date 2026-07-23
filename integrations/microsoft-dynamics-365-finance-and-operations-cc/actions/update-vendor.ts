import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code (data area ID). Example: "dat"'),
    vendorAccountNumber: z.string().describe('Vendor account number to update. Example: "DAT-0000000002"'),
    vendorOrganizationName: z.string().optional().describe('Vendor organization name.'),
    addressCity: z.string().optional().describe('City of the vendor address.'),
    addressCountryRegionId: z.string().optional().describe('Country/region code of the vendor address.'),
    primaryContactEmail: z.string().optional().describe('Primary contact email address.')
});

const ProviderVendorSchema = z.object({
    dataAreaId: z.string(),
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().optional().nullable(),
    AddressCity: z.string().optional().nullable(),
    AddressCountryRegionId: z.string().optional().nullable(),
    PrimaryContactEmail: z.string().optional().nullable()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    vendorAccountNumber: z.string(),
    vendorOrganizationName: z.string().optional(),
    addressCity: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    primaryContactEmail: z.string().optional()
});

const action = createAction({
    description: 'Update a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/data/VendorsV2(dataAreaId='${encodeURIComponent(input.dataAreaId)}',VendorAccountNumber='${encodeURIComponent(input.vendorAccountNumber)}')`;

        const patchBody: Record<string, unknown> = {};
        if (input.vendorOrganizationName !== undefined) {
            patchBody['VendorOrganizationName'] = input.vendorOrganizationName;
        }
        if (input.addressCity !== undefined) {
            patchBody['AddressCity'] = input.addressCity;
        }
        if (input.addressCountryRegionId !== undefined) {
            patchBody['AddressCountryRegionId'] = input.addressCountryRegionId;
        }
        if (input.primaryContactEmail !== undefined) {
            patchBody['PrimaryContactEmail'] = input.primaryContactEmail;
        }

        const patchResponse = await nango.patch({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint,
            data: patchBody,
            retries: 10
        });

        if (patchResponse.status === 204) {
            const getResponse = await nango.get({
                // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
                endpoint,
                retries: 3
            });

            const vendor = ProviderVendorSchema.parse(getResponse.data);

            return {
                dataAreaId: vendor.dataAreaId,
                vendorAccountNumber: vendor.VendorAccountNumber,
                ...(vendor.VendorOrganizationName != null && { vendorOrganizationName: vendor.VendorOrganizationName }),
                ...(vendor.AddressCity != null && { addressCity: vendor.AddressCity }),
                ...(vendor.AddressCountryRegionId != null && { addressCountryRegionId: vendor.AddressCountryRegionId }),
                ...(vendor.PrimaryContactEmail != null && { primaryContactEmail: vendor.PrimaryContactEmail })
            };
        }

        const vendor = ProviderVendorSchema.parse(patchResponse.data);

        return {
            dataAreaId: vendor.dataAreaId,
            vendorAccountNumber: vendor.VendorAccountNumber,
            ...(vendor.VendorOrganizationName != null && { vendorOrganizationName: vendor.VendorOrganizationName }),
            ...(vendor.AddressCity != null && { addressCity: vendor.AddressCity }),
            ...(vendor.AddressCountryRegionId != null && { addressCountryRegionId: vendor.AddressCountryRegionId }),
            ...(vendor.PrimaryContactEmail != null && { primaryContactEmail: vendor.PrimaryContactEmail })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
