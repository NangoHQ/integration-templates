import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SupplierSchema = z
    .object({
        id: z.string().describe('Opaque supplier ID in the connected company.'),
        name: z.string().nullable().optional().describe('Supplier name; omitted if absent.'),
        email: z.string().nullable().optional().describe('Contact email; null and empty are preserved.'),
        version: z.number().int().optional().describe('Provider record revision, when returned.'),
        isCustomer: z.boolean().nullable().optional().describe('Whether the supplier also represents a customer.'),
        isInactive: z.boolean().nullable().optional().describe('Whether the supplier is inactive.'),
        description: z.string().nullable().optional().describe('Supplier notes, when returned.'),
        phoneNumber: z.string().nullable().optional().describe('Contact telephone number, when returned.'),
        invoiceEmail: z.string().nullable().optional().describe('Invoice email; null and empty are preserved.'),
        organizationNumber: z.string().nullable().optional().describe('Organization registration number; omitted if absent.')
    })
    .describe('Tripletex supplier identity, contact, and classification record.');

// The checkpoint schema accepts only plain string/number/boolean fields, so
// empty-string sentinels mark "no incremental window" and "no resume state".
const CheckpointSchema = z.object({
    changed_since: z.string(),
    phase: z.string(),
    from: z.number().int().min(0)
});

// Internal parser for the pinned GET /supplier response values (Tripletex API
// 2.75.x). Only the fields mapped into the public model are read. Unset fields
// are omitted by the provider; every optional field is also accepted as an
// explicit null so a null payload never fails a whole page.
const TripletexSupplierSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    version: z.number().int().nullable().optional(),
    isCustomer: z.boolean().nullable().optional(),
    isInactive: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    invoiceEmail: z.string().nullable().optional(),
    organizationNumber: z.string().nullable().optional()
});

type TripletexSupplier = z.infer<typeof TripletexSupplierSchema>;
type SupplierRecord = z.infer<typeof SupplierSchema>;

function toSupplierRecord(supplier: TripletexSupplier): SupplierRecord {
    // Absent provider fields stay absent, explicit nulls are preserved where the
    // public schema allows them, and empty strings pass through unchanged.
    return {
        id: String(supplier.id),
        ...(supplier.name !== undefined && { name: supplier.name }),
        ...(supplier.email !== undefined && { email: supplier.email }),
        ...(supplier.version != null && { version: supplier.version }),
        ...(supplier.isCustomer !== undefined && { isCustomer: supplier.isCustomer }),
        ...(supplier.isInactive !== undefined && { isInactive: supplier.isInactive }),
        ...(supplier.description !== undefined && { description: supplier.description }),
        ...(supplier.phoneNumber !== undefined && { phoneNumber: supplier.phoneNumber }),
        ...(supplier.invoiceEmail !== undefined && { invoiceEmail: supplier.invoiceEmail }),
        ...(supplier.organizationNumber !== undefined && { organizationNumber: supplier.organizationNumber })
    };
}

const sync = createSync({
    description: 'Make supplier identity, contact, and classification records available as a replicated dataset, including active and inactive suppliers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Supplier: SupplierSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let changedSince: string | undefined;
        let resumePhase: 'active' | 'inactive' | undefined;
        let resumeFrom = 0;
        if (checkpoint) {
            changedSince = checkpoint.changed_since !== '' ? checkpoint.changed_since : undefined;
            resumePhase = checkpoint.phase === 'active' || checkpoint.phase === 'inactive' ? checkpoint.phase : undefined;
            resumeFrom = checkpoint.from;
        }
        // Captured before the first request so a record changed while this run is
        // still paging is newer than the next run's changedSince filter.
        const nextChangedSince = new Date().toISOString();

        // GET /supplier filters to active suppliers unless isInactive is set
        // explicitly, so active and inactive suppliers are read in two passes.
        // Deletions cannot be tracked: Tripletex exposes no deleted-supplier
        // feed, and a changed-only read must never drive trackDeletes.
        const phases: { phase: 'active' | 'inactive'; isInactive: 'false' | 'true' }[] = [
            { phase: 'active', isInactive: 'false' },
            { phase: 'inactive', isInactive: 'true' }
        ];

        for (const { phase, isInactive } of phases) {
            if (resumePhase === 'inactive' && phase === 'active') {
                continue;
            }
            let from = phase === resumePhase ? resumeFrom : 0;

            const proxyConfig: ProxyConfiguration = {
                // https://tripletex.no/v2/openapi.json#GET%20/supplier
                endpoint: '/supplier',
                params: changedSince ? { isInactive, changedSince } : { isInactive },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'from',
                    offset_start_value: from,
                    offset_calculation_method: 'by-response-size',
                    limit_name_in_request: 'count',
                    limit: 1000,
                    response_path: 'values'
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const suppliers = z.array(TripletexSupplierSchema).parse(page);
                if (suppliers.length > 0) {
                    await nango.batchSave(suppliers.map(toSupplierRecord), 'Supplier');
                }
                from += suppliers.length;
                await nango.saveCheckpoint({
                    changed_since: changedSince ?? '',
                    phase,
                    from
                });
            }
        }

        await nango.saveCheckpoint({ changed_since: nextChangedSince, phase: '', from: 0 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
