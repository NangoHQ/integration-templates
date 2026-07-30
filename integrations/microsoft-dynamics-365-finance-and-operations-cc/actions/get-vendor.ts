import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity ID. Example: "dat"'),
    vendorAccountNumber: z.string().describe('Vendor account number. Example: "DAT-0000000002"')
});

const ProviderVendorSchema = z
    .object({
        dataAreaId: z.string(),
        VendorAccountNumber: z.string()
    })
    .passthrough();

const OutputSchema = z
    .object({
        dataAreaId: z.string(),
        VendorAccountNumber: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/VendorsV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',VendorAccountNumber='${encodeURIComponent(input.vendorAccountNumber.replace(/'/g, "''"))}')`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor not found',
                dataAreaId: input.dataAreaId,
                vendorAccountNumber: input.vendorAccountNumber
            });
        }

        const providerVendor = ProviderVendorSchema.parse(response.data);

        return OutputSchema.parse(providerVendor);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
