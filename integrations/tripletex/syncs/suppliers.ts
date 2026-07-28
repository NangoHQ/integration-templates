import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawSupplierSchema = z.object({
    id: z.number(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    description: z.string().optional(),
    isInactive: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    website: z.string().optional(),
    language: z.string().optional(),
    displayName: z.string().optional()
});

const SupplierSchema = z.object({
    id: z.string(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    description: z.string().optional(),
    isInactive: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    website: z.string().optional(),
    language: z.string().optional(),
    displayName: z.string().optional()
});

const sync = createSync({
    description: 'Sync suppliers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Supplier: SupplierSchema
    },

    exec: async (nango) => {
        // Full refresh: no confirmed incremental filter (changedSince was present in swagger but not verified live
        // to return only changed rows vs the full set). Use delete tracking after a complete successful crawl.
        await nango.trackDeletesStart('Supplier');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/supplier',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(RawSupplierSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse suppliers: ${parsed.error.message}`);
            }

            const suppliers = parsed.data.map((record) => ({
                id: String(record.id),
                name: record.name,
                ...(record.organizationNumber != null && { organizationNumber: record.organizationNumber }),
                ...(record.supplierNumber != null && { supplierNumber: record.supplierNumber }),
                ...(record.email != null && { email: record.email }),
                ...(record.invoiceEmail != null && { invoiceEmail: record.invoiceEmail }),
                ...(record.phoneNumber != null && { phoneNumber: record.phoneNumber }),
                ...(record.description != null && { description: record.description }),
                ...(record.isInactive != null && { isInactive: record.isInactive }),
                ...(record.isCustomer != null && { isCustomer: record.isCustomer }),
                ...(record.website != null && { website: record.website }),
                ...(record.language != null && { language: record.language }),
                ...(record.displayName != null && { displayName: record.displayName })
            }));

            if (suppliers.length > 0) {
                await nango.batchSave(suppliers, 'Supplier');
            }
        }

        await nango.trackDeletesEnd('Supplier');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
