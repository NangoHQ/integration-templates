import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity ID. Example: "dat"'),
    VendorOrganizationName: z.string().describe('Name of the vendor organization'),
    VendorGroupId: z.string().describe('Vendor group ID from VendorGroups. Example: "Construct"'),
    VendorAccountNumber: z.string().optional().describe('Optional vendor account number')
});

const ProviderVendorSchema = z
    .object({
        dataAreaId: z.string(),
        VendorAccountNumber: z.string().optional(),
        VendorOrganizationName: z.string().optional(),
        VendorGroupId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string(),
    VendorAccountNumber: z.string().optional(),
    VendorOrganizationName: z.string().optional(),
    VendorGroupId: z.string().optional()
});

const action = createAction({
    description: 'Create a vendor',
    version: '1.0.0',
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
                ...(input.VendorAccountNumber !== undefined && { VendorAccountNumber: input.VendorAccountNumber })
            },
            retries: 10
        });

        const providerVendor = ProviderVendorSchema.parse(response.data);

        return {
            dataAreaId: providerVendor.dataAreaId,
            ...(providerVendor.VendorAccountNumber !== undefined && { VendorAccountNumber: providerVendor.VendorAccountNumber }),
            ...(providerVendor.VendorOrganizationName !== undefined && { VendorOrganizationName: providerVendor.VendorOrganizationName }),
            ...(providerVendor.VendorGroupId !== undefined && { VendorGroupId: providerVendor.VendorGroupId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
