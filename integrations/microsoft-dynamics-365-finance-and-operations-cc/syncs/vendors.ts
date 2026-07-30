import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VendorV2ResponseSchema = z
    .object({
        VendorAccountNumber: z.string(),
        VendorOrganizationName: z.string().nullish(),
        VendorGroupId: z.string().nullish(),
        AddressCity: z.string().nullish(),
        AddressCountryRegionId: z.string().nullish(),
        AddressState: z.string().nullish(),
        AddressZipCode: z.string().nullish(),
        AddressStreet: z.string().nullish(),
        PrimaryContactEmail: z.string().nullish(),
        PrimaryContactPhone: z.string().nullish(),
        dataAreaId: z.string()
    })
    .passthrough();

const VendorSchema = z.object({
    id: z.string(),
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().optional(),
    VendorGroupId: z.string().optional(),
    AddressCity: z.string().optional(),
    AddressCountryRegionId: z.string().optional(),
    AddressState: z.string().optional(),
    AddressZipCode: z.string().optional(),
    AddressStreet: z.string().optional(),
    PrimaryContactEmail: z.string().optional(),
    PrimaryContactPhone: z.string().optional(),
    dataAreaId: z.string()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync vendors.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Vendor: VendorSchema
    },

    exec: async (nango) => {
        // Blocker: VendorsV2 exposes no filterable last-modified timestamp in this
        // environment, so full refresh with $top/$skip paging is required.
        // Persist the current $skip offset so an interrupted crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorsV2',
            params: {
                $orderby: 'dataAreaId asc,VendorAccountNumber asc',
                'cross-company': 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'by-response-size',
                offset_start_value: offset,
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const vendors = [];
            for (const raw of batch) {
                const parsed = VendorV2ResponseSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse vendor: ${parsed.error.message}`);
                }
                const v = parsed.data;
                vendors.push({
                    id: `${v.dataAreaId}-${v.VendorAccountNumber}`,
                    VendorAccountNumber: v.VendorAccountNumber,
                    ...(v.VendorOrganizationName != null && { VendorOrganizationName: v.VendorOrganizationName }),
                    ...(v.VendorGroupId != null && { VendorGroupId: v.VendorGroupId }),
                    ...(v.AddressCity != null && { AddressCity: v.AddressCity }),
                    ...(v.AddressCountryRegionId != null && { AddressCountryRegionId: v.AddressCountryRegionId }),
                    ...(v.AddressState != null && { AddressState: v.AddressState }),
                    ...(v.AddressZipCode != null && { AddressZipCode: v.AddressZipCode }),
                    ...(v.AddressStreet != null && { AddressStreet: v.AddressStreet }),
                    ...(v.PrimaryContactEmail != null && { PrimaryContactEmail: v.PrimaryContactEmail }),
                    ...(v.PrimaryContactPhone != null && { PrimaryContactPhone: v.PrimaryContactPhone }),
                    dataAreaId: v.dataAreaId
                });
            }

            if (!trackingStarted && vendors.length > 0) {
                await nango.trackDeletesStart('Vendor');
                trackingStarted = true;
            }

            if (vendors.length > 0) {
                await nango.batchSave(vendors, 'Vendor');
            }

            offset += batch.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('Vendor');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
