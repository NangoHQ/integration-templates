import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReleasedProductSchema = z
    .object({
        dataAreaId: z.string(),
        ItemNumber: z.string(),
        ProductName: z.string().nullish(),
        SearchName: z.string().nullish(),
        ProductGroupId: z.string().nullish(),
        ItemModelGroupId: z.string().nullish(),
        ProductNumber: z.string().nullish()
    })
    .passthrough();

const ReleasedProductModelSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    itemNumber: z.string(),
    productName: z.string().optional(),
    searchName: z.string().optional(),
    productGroupId: z.string().optional(),
    itemModelGroupId: z.string().optional(),
    productNumber: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync released products (items).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ReleasedProduct: ReleasedProductModelSchema
    },

    exec: async (nango) => {
        // Blocker: ReleasedProductsV2 exposes no filterable last-modified timestamp
        // in this environment, so full-refresh with delete tracking is required.
        // Persist the current $skip offset so an interrupted crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;

        // offset can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. trackDeletesStart is only
        // actually called once we've seen a validated page that contains records, so an
        // empty/anomalous response never opens (and therefore never completes) a window that
        // would wipe the whole cache.
        let trackingStarted = offset > 0;

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const proxyConfig = {
            endpoint: '/data/ReleasedProductsV2',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,ItemNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const page of nango.paginate(proxyConfig)) {
            const releasedProducts: z.infer<typeof ReleasedProductModelSchema>[] = [];

            for (let i = 0; i < page.length; i++) {
                const raw: unknown = page[i];
                const record = ReleasedProductSchema.parse(raw);

                releasedProducts.push({
                    // Composite id: item numbers can repeat across legal entities, so dataAreaId
                    // must be part of the persisted id to avoid collisions/overwrites between companies.
                    id: `${record.dataAreaId}|${record.ItemNumber}`,
                    dataAreaId: record.dataAreaId,
                    itemNumber: record.ItemNumber,
                    productName: record.ProductName ?? undefined,
                    searchName: record.SearchName ?? undefined,
                    productGroupId: record.ProductGroupId ?? undefined,
                    itemModelGroupId: record.ItemModelGroupId ?? undefined,
                    productNumber: record.ProductNumber ?? undefined
                });
            }

            if (!trackingStarted && releasedProducts.length > 0) {
                await nango.trackDeletesStart('ReleasedProduct');
                trackingStarted = true;
            }

            if (releasedProducts.length > 0) {
                await nango.batchSave(releasedProducts, 'ReleasedProduct');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('ReleasedProduct');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
