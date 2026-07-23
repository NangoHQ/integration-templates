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

        // trackDeletesStart is called once the very next page (fresh or resumed) has been
        // fetched and validated below — on every execution, not just when skip === 0 — so a
        // resumed execution still (re-)opens the delete-tracking window, and a failed/invalid
        // page never leaves tracking "started" with nothing validated. Safe/idempotent to call
        // again if a prior execution already started it while the window is open.
        let shouldStartTracking = true;

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

            if (shouldStartTracking) {
                await nango.trackDeletesStart('Customer');
                shouldStartTracking = false;
            }

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Customer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
