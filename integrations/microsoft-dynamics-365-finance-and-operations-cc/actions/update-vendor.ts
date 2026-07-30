import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / legal entity. Example: "dat"'),
    vendorAccountNumber: z.string().describe('Vendor account number. Example: "DAT-0000000002"'),
    vendorOrganizationName: z.string().optional().describe('Vendor organization name'),
    vendorGroupId: z.string().optional().describe('Vendor group ID'),
    currencyCode: z.string().optional().describe('Currency code'),
    addressCity: z.string().optional().describe('City of the vendor address'),
    additionalProperties: z.record(z.string(), z.unknown()).optional().describe('Additional properties to update')
});

const ProviderVendorSchema = z
    .object({
        dataAreaId: z.string().optional(),
        VendorAccountNumber: z.string().optional(),
        VendorOrganizationName: z.string().nullable().optional(),
        VendorGroupId: z.string().nullable().optional(),
        CurrencyCode: z.string().nullable().optional(),
        AddressCity: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        dataAreaId: z.string().optional(),
        vendorAccountNumber: z.string().optional(),
        vendorOrganizationName: z.string().optional(),
        vendorGroupId: z.string().optional(),
        currencyCode: z.string().optional(),
        addressCity: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Financials'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/data/VendorsV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',VendorAccountNumber='${encodeURIComponent(input.vendorAccountNumber.replace(/'/g, "''"))}')`;

        const patchData: Record<string, unknown> = {
            ...(input.vendorOrganizationName !== undefined && { VendorOrganizationName: input.vendorOrganizationName }),
            ...(input.vendorGroupId !== undefined && { VendorGroupId: input.vendorGroupId }),
            ...(input.currencyCode !== undefined && { CurrencyCode: input.currencyCode }),
            ...(input.addressCity !== undefined && { AddressCity: input.addressCity }),
            ...(input.additionalProperties !== undefined && input.additionalProperties)
        };

        if (Object.keys(patchData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one property to update must be provided.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const patchResponse = await nango.patch({
            endpoint,
            data: patchData,
            retries: 1
        });

        let vendorData: unknown = patchResponse.data;

        if (!vendorData) {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            const getResponse = await nango.get({
                endpoint,
                retries: 3
            });
            vendorData = getResponse.data;
        }

        if (!vendorData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor not found after update.',
                dataAreaId: input.dataAreaId,
                vendorAccountNumber: input.vendorAccountNumber
            });
        }

        const providerVendor = ProviderVendorSchema.parse(vendorData);

        return {
            ...(providerVendor.dataAreaId !== undefined && { dataAreaId: providerVendor.dataAreaId }),
            ...(providerVendor.VendorAccountNumber !== undefined && { vendorAccountNumber: providerVendor.VendorAccountNumber }),
            ...(providerVendor.VendorOrganizationName != null && { vendorOrganizationName: providerVendor.VendorOrganizationName }),
            ...(providerVendor.VendorGroupId != null && { vendorGroupId: providerVendor.VendorGroupId }),
            ...(providerVendor.CurrencyCode != null && { currencyCode: providerVendor.CurrencyCode }),
            ...(providerVendor.AddressCity != null && { addressCity: providerVendor.AddressCity })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
