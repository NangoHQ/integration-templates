import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VendorSchema = z.object({
    id: z.string(),
    vendorAccountNumber: z.string(),
    vendorOrganizationName: z.string().optional(),
    vendorName: z.string().optional(),
    vendorPartyType: z.string().optional(),
    addressCity: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    dataAreaId: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number()
});

const RawVendorSchema = z.object({
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().nullish(),
    VendorName: z.string().nullish(),
    VendorPartyType: z.string().nullish(),
    AddressCity: z.string().nullish(),
    AddressCountryRegionId: z.string().nullish(),
    PrimaryContactEmail: z.string().nullish(),
    dataAreaId: z.string().nullish()
});

const sync = createSync({
    description: 'Sync vendors',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Vendor: VendorSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        if (skip === 0) {
            await nango.trackDeletesStart('Vendor');
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorsV2',
            params: {
                $orderby: 'VendorAccountNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value',
                offset_calculation_method: 'by-response-size'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const vendors = [];
            for (const item of page) {
                const parsed = RawVendorSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse vendor record: ${parsed.error.message}`);
                }

                const data = parsed.data;
                const id = `${data.dataAreaId ?? 'unknown'}_${data.VendorAccountNumber}`;

                vendors.push({
                    id,
                    vendorAccountNumber: data.VendorAccountNumber,
                    ...(data.VendorOrganizationName != null && { vendorOrganizationName: data.VendorOrganizationName }),
                    ...(data.VendorName != null && { vendorName: data.VendorName }),
                    ...(data.VendorPartyType != null && { vendorPartyType: data.VendorPartyType }),
                    ...(data.AddressCity != null && { addressCity: data.AddressCity }),
                    ...(data.AddressCountryRegionId != null && { addressCountryRegionId: data.AddressCountryRegionId }),
                    ...(data.PrimaryContactEmail != null && { primaryContactEmail: data.PrimaryContactEmail }),
                    ...(data.dataAreaId != null && { dataAreaId: data.dataAreaId })
                });
            }

            if (vendors.length > 0) {
                await nango.batchSave(vendors, 'Vendor');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Vendor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
