import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/entity-customers-v3-customerv3
const ProviderCustomerSchema = z.object({
    CustomerAccount: z.string(),
    dataAreaId: z.string(),
    OrganizationName: z.string().nullable().optional(),
    PersonFirstName: z.string().nullable().optional(),
    PersonLastName: z.string().nullable().optional(),
    CustomerGroupId: z.string().nullable().optional(),
    SalesCurrencyCode: z.string().nullable().optional(),
    PaymentTerms: z.string().nullable().optional(),
    SalesTaxGroup: z.string().nullable().optional(),
    AddressCity: z.string().nullable().optional(),
    AddressCountryRegionId: z.string().nullable().optional(),
    AddressState: z.string().nullable().optional(),
    AddressZipCode: z.string().nullable().optional(),
    AddressStreet: z.string().nullable().optional(),
    PrimaryContactEmail: z.string().nullable().optional(),
    PrimaryContactPhone: z.string().nullable().optional(),
    PartyType: z.string().nullable().optional(),
    InvoiceAccount: z.string().nullable().optional()
});

const CustomerSchema = z.object({
    id: z.string(),
    customerAccount: z.string(),
    dataAreaId: z.string(),
    name: z.string().optional(),
    customerGroupId: z.string().optional(),
    salesCurrencyCode: z.string().optional(),
    paymentTerms: z.string().optional(),
    salesTaxGroup: z.string().optional(),
    addressCity: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    addressState: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressStreet: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    primaryContactPhone: z.string().optional(),
    partyType: z.string().optional(),
    invoiceAccount: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync customers.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        // Blocker: CustomersV3 exposes no filterable last-modified timestamp field
        // in this environment, so full refresh with delete tracking is required.
        // We still persist the current $skip offset so an interrupted crawl can
        // resume within the same delete-tracking window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomersV3',
            params: {
                $orderby: 'dataAreaId asc,CustomerAccount asc',
                'cross-company': 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 10000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!trackingStarted) {
                await nango.trackDeletesStart('Customer');
                trackingStarted = true;
            }

            const customers = page.map((record: unknown) => {
                const parsed = ProviderCustomerSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer record: ${parsed.error.message}`);
                }

                const raw = parsed.data;
                const id = `${raw.dataAreaId}-${raw.CustomerAccount}`;

                let name: string | undefined;
                if (raw.PartyType === 'Person') {
                    const parts = [raw.PersonFirstName, raw.PersonLastName].filter((p): p is string => p != null);
                    if (parts.length > 0) {
                        name = parts.join(' ');
                    }
                }
                if (!name) {
                    name = raw.OrganizationName ?? undefined;
                }

                return {
                    id,
                    customerAccount: raw.CustomerAccount,
                    dataAreaId: raw.dataAreaId,
                    ...(name && { name }),
                    ...(raw.CustomerGroupId != null && { customerGroupId: raw.CustomerGroupId }),
                    ...(raw.SalesCurrencyCode != null && { salesCurrencyCode: raw.SalesCurrencyCode }),
                    ...(raw.PaymentTerms != null && { paymentTerms: raw.PaymentTerms }),
                    ...(raw.SalesTaxGroup != null && { salesTaxGroup: raw.SalesTaxGroup }),
                    ...(raw.AddressCity != null && { addressCity: raw.AddressCity }),
                    ...(raw.AddressCountryRegionId != null && { addressCountryRegionId: raw.AddressCountryRegionId }),
                    ...(raw.AddressState != null && { addressState: raw.AddressState }),
                    ...(raw.AddressZipCode != null && { addressZipCode: raw.AddressZipCode }),
                    ...(raw.AddressStreet != null && { addressStreet: raw.AddressStreet }),
                    ...(raw.PrimaryContactEmail != null && { primaryContactEmail: raw.PrimaryContactEmail }),
                    ...(raw.PrimaryContactPhone != null && { primaryContactPhone: raw.PrimaryContactPhone }),
                    ...(raw.PartyType != null && { partyType: raw.PartyType }),
                    ...(raw.InvoiceAccount != null && { invoiceAccount: raw.InvoiceAccount })
                };
            });

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
