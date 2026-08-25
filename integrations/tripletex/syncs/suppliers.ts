import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawSupplierSchema = z.object({
    id: z.number(),
    name: z.string(),
    organizationNumber: z.string().nullish(),
    supplierNumber: z.number().nullish(),
    email: z.string().nullish(),
    invoiceEmail: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    description: z.string().nullish(),
    isInactive: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    website: z.string().nullish(),
    language: z.string().nullish(),
    displayName: z.string().nullish()
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

const DEFAULT_CHECKPOINT = {
    from: 0
};

const CheckpointSchema = z.object({
    from: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync suppliers.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Supplier: SupplierSchema
    },

    exec: async (nango) => {
        // Full refresh: no confirmed incremental filter (changedSince was present in swagger but not verified live
        // to return only changed rows vs the full set). Use delete tracking after a complete successful crawl.
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse({
            ...DEFAULT_CHECKPOINT,
            ...(rawCheckpoint ?? {})
        });
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        let from: number = parsedCheckpoint.data.from;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/supplier',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: from,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        function parsePage(page: unknown): z.infer<typeof SupplierSchema>[] {
            const parsed = z.array(RawSupplierSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse suppliers: ${parsed.error.message}`);
            }

            return parsed.data.map((record) => ({
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
        }

        await nango.trackDeletesStart('Supplier');

        for await (const page of nango.paginate(proxyConfig)) {
            const suppliers = parsePage(page);
            if (suppliers.length > 0) {
                await nango.batchSave(suppliers, 'Supplier');
            }

            from += suppliers.length;
            await nango.saveCheckpoint({ from });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Supplier');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
