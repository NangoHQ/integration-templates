import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    customerAccount: z.string(),
    dataAreaId: z.string(),
    organizationName: z.string().optional(),
    nameAlias: z.string().optional(),
    customerGroupId: z.string().optional(),
    salesCurrencyCode: z.string().optional(),
    paymentTerms: z.string().optional(),
    partyNumber: z.string().optional()
});

const ProviderCustomerSchema = z
    .object({
        CustomerAccount: z.string(),
        dataAreaId: z.string(),
        OrganizationName: z.string().nullish(),
        NameAlias: z.string().nullish(),
        CustomerGroupId: z.string().nullish(),
        SalesCurrencyCode: z.string().nullish(),
        PaymentTerms: z.string().nullish(),
        PartyNumber: z.string().nullish()
    })
    .passthrough();

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        // skip can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. On a resumed execution we must
        // NOT call trackDeletesStart again — that would open a fresh window covering only the
        // remaining pages, and trackDeletesEnd would then treat every customer from the
        // already-processed pages as missing and delete it. trackDeletesStart is only actually
        // called once we've seen a validated page that contains records, so an empty/anomalous
        // response never opens (and therefore never completes) a window that would wipe the
        // whole cache.
        let trackingStarted = skip > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomersV3',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,CustomerAccount asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 10000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const customers = page.map((record: unknown) => {
                const parsed = ProviderCustomerSchema.parse(record);
                return {
                    // Composite id: customer account numbers can repeat across legal entities, so dataAreaId
                    // must be part of the persisted id to avoid collisions/overwrites between companies.
                    id: `${parsed.dataAreaId}|${parsed.CustomerAccount}`,
                    customerAccount: parsed.CustomerAccount,
                    dataAreaId: parsed.dataAreaId,
                    ...(parsed.OrganizationName != null && { organizationName: parsed.OrganizationName }),
                    ...(parsed.NameAlias != null && { nameAlias: parsed.NameAlias }),
                    ...(parsed.CustomerGroupId != null && { customerGroupId: parsed.CustomerGroupId }),
                    ...(parsed.SalesCurrencyCode != null && { salesCurrencyCode: parsed.SalesCurrencyCode }),
                    ...(parsed.PaymentTerms != null && { paymentTerms: parsed.PaymentTerms }),
                    ...(parsed.PartyNumber != null && { partyNumber: parsed.PartyNumber })
                };
            });

            if (!trackingStarted && customers.length > 0) {
                await nango.trackDeletesStart('Customer');
                trackingStarted = true;
            }

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
