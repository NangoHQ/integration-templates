import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity ID. Example: "dat"'),
    VendorOrganizationName: z.string().describe('Name of the vendor organization'),
    VendorGroupId: z.string().describe('Vendor group ID from VendorGroups. Example: "Construct"'),
    VendorAccountNumber: z.string().optional().describe('Optional vendor account number'),
    addressCity: z.string().optional().describe('City of the vendor address. Example: "New York"'),
    addressStreet: z.string().optional().describe('Street of the vendor address. Example: "123 Main St"'),
    addressStateId: z.string().optional().describe('State of the vendor address. Example: "NY"'),
    addressZipCode: z.string().optional().describe('ZIP / postal code of the vendor address. Example: "10001"'),
    addressCountryRegionId: z.string().optional().describe('Country/region of the vendor address. Example: "USA"'),
    primaryEmailAddress: z.string().optional().describe('Primary email address of the vendor.'),
    primaryPhoneNumber: z.string().optional().describe('Primary phone number of the vendor.')
});

const ProviderVendorSchema = z
    .object({
        dataAreaId: z.string(),
        VendorAccountNumber: z.string().optional(),
        VendorOrganizationName: z.string().optional(),
        VendorGroupId: z.string().optional(),
        AddressCity: z.string().nullable().optional(),
        AddressStreet: z.string().nullable().optional(),
        AddressStateId: z.string().nullable().optional(),
        AddressZipCode: z.string().nullable().optional(),
        AddressCountryRegionId: z.string().nullable().optional(),
        PrimaryEmailAddress: z.string().nullable().optional(),
        PrimaryPhoneNumber: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string(),
    VendorAccountNumber: z.string().optional(),
    VendorOrganizationName: z.string().optional(),
    VendorGroupId: z.string().optional(),
    addressCity: z.string().optional(),
    addressStreet: z.string().optional(),
    addressStateId: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    primaryEmailAddress: z.string().optional(),
    primaryPhoneNumber: z.string().optional()
});

const action = createAction({
    description: 'Create a vendor',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorsV2',
            data: {
                dataAreaId: input.dataAreaId,
                VendorOrganizationName: input.VendorOrganizationName,
                VendorGroupId: input.VendorGroupId,
                ...(input.VendorAccountNumber !== undefined && { VendorAccountNumber: input.VendorAccountNumber }),
                ...(input.addressCity !== undefined && { AddressCity: input.addressCity }),
                ...(input.addressStreet !== undefined && { AddressStreet: input.addressStreet }),
                ...(input.addressStateId !== undefined && { AddressStateId: input.addressStateId }),
                ...(input.addressZipCode !== undefined && { AddressZipCode: input.addressZipCode }),
                ...(input.addressCountryRegionId !== undefined && { AddressCountryRegionId: input.addressCountryRegionId }),
                ...(input.primaryEmailAddress !== undefined && { PrimaryEmailAddress: input.primaryEmailAddress }),
                ...(input.primaryPhoneNumber !== undefined && { PrimaryPhoneNumber: input.primaryPhoneNumber })
            },
            retries: 10
        });

        const providerVendor = ProviderVendorSchema.parse(response.data);

        return {
            dataAreaId: providerVendor.dataAreaId,
            ...(providerVendor.VendorAccountNumber !== undefined && { VendorAccountNumber: providerVendor.VendorAccountNumber }),
            ...(providerVendor.VendorOrganizationName !== undefined && { VendorOrganizationName: providerVendor.VendorOrganizationName }),
            ...(providerVendor.VendorGroupId !== undefined && { VendorGroupId: providerVendor.VendorGroupId }),
            ...(providerVendor.AddressCity != null && providerVendor.AddressCity !== '' && { addressCity: providerVendor.AddressCity }),
            ...(providerVendor.AddressStreet != null && providerVendor.AddressStreet !== '' && { addressStreet: providerVendor.AddressStreet }),
            ...(providerVendor.AddressStateId != null && providerVendor.AddressStateId !== '' && { addressStateId: providerVendor.AddressStateId }),
            ...(providerVendor.AddressZipCode != null && providerVendor.AddressZipCode !== '' && { addressZipCode: providerVendor.AddressZipCode }),
            ...(providerVendor.AddressCountryRegionId != null &&
                providerVendor.AddressCountryRegionId !== '' && { addressCountryRegionId: providerVendor.AddressCountryRegionId }),
            ...(providerVendor.PrimaryEmailAddress != null &&
                providerVendor.PrimaryEmailAddress !== '' && { primaryEmailAddress: providerVendor.PrimaryEmailAddress }),
            ...(providerVendor.PrimaryPhoneNumber != null &&
                providerVendor.PrimaryPhoneNumber !== '' && { primaryPhoneNumber: providerVendor.PrimaryPhoneNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
