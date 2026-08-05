import { createSync } from 'nango';
import { z } from 'zod';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        // @allowTryCatch
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error('unreachable');
}

// Workday's Staffing REST /workers resource doesn't expose hire/termination dates, manager,
// company, cost-center, or department references the way the SOAP Get_Workers response did.
const WorkerSchema = z.object({
    id: z.string().describe('Worker unique identifier'),
    employee_id: z.string().optional().describe('Employee ID from Workday'),
    contingent_worker_id: z.string().optional().describe('Contingent Worker ID from Workday'),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    worker_type: z.string().optional().describe('Employee or Contingent Worker'),
    business_title: z.string().optional(),
    job_profile_id: z.string().optional(),
    location_id: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number()
});

const ProviderRelatedViewSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    workerId: z.string().optional(),
    workerType: ProviderRelatedViewSchema.optional(),
    person: z.object({ email: z.string().optional(), phone: z.string().optional() }).optional(),
    primaryJob: z
        .object({
            businessTitle: z.string().optional(),
            jobProfile: ProviderRelatedViewSchema.optional(),
            location: ProviderRelatedViewSchema.optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderWorkerSchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync workers from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/workers' }],
    checkpoint: CheckpointSchema,
    models: {
        Worker: WorkerSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw || { offset: 0 };
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // Blocker: Workday's workers resource does not support modified_since or updated_after
        // filters. It only supports pagination via limit/offset. Therefore, we perform a full
        // refresh with trackDeletesStart/trackDeletesEnd.
        await nango.trackDeletesStart('Worker');

        let offset = checkpoint.offset;
        let total = 0;

        do {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/workers
            const response = await withRetry(() =>
                nango.get({
                    endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/workers`,
                    params: { limit: PAGE_SIZE, offset, includeTerminatedWorkers: 'true' },
                    retries: 3
                })
            );

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const workers = providerResponse.data ?? [];
            total = providerResponse.total ?? workers.length;

            const mappedWorkers: z.infer<typeof WorkerSchema>[] = workers.map((worker) => {
                const workerId = worker.workerId ?? worker.id;
                const isContingent = (worker.workerType?.descriptor ?? '').toLowerCase().includes('contingent');

                return {
                    id: workerId,
                    ...(isContingent ? { contingent_worker_id: workerId } : { employee_id: workerId }),
                    ...(worker.descriptor !== undefined && { name: worker.descriptor }),
                    ...(worker.person?.email !== undefined && { email: worker.person.email }),
                    ...(worker.person?.phone !== undefined && { phone: worker.person.phone }),
                    ...(worker.workerType?.descriptor !== undefined && { worker_type: worker.workerType.descriptor }),
                    ...(worker.primaryJob?.businessTitle !== undefined && { business_title: worker.primaryJob.businessTitle }),
                    ...(worker.primaryJob?.jobProfile?.id !== undefined && { job_profile_id: worker.primaryJob.jobProfile.id }),
                    ...(worker.primaryJob?.location?.id !== undefined && { location_id: worker.primaryJob.location.id })
                };
            });

            if (mappedWorkers.length > 0) {
                await nango.batchSave(mappedWorkers, 'Worker');
            }

            offset += PAGE_SIZE;
            if (offset < total) {
                await nango.saveCheckpoint({ offset });
            }
        } while (offset < total);

        await nango.trackDeletesEnd('Worker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
