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

// Workday's Staffing REST /workers resource doesn't expose first/last name components, hire/termination
// dates, department, or manager references the way the SOAP Get_Workers response did.
const EmployeeSchema = z.object({
    id: z.string(),
    worker_id: z.string().optional(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    active: z.boolean().optional(),
    job_title: z.string().optional(),
    location: z.string().optional(),
    employment_type: z.string().optional()
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
            location: ProviderRelatedViewSchema.optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderWorkerSchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync Workday employees and contingent workers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/employees' }],
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        await nango.trackDeletesStart('Employee');

        let offset = 0;
        let total = 0;

        do {
            await nango.log(`Fetching offset ${offset}`);

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

            const employees: z.infer<typeof EmployeeSchema>[] = workers.map((worker) => {
                const workerId = worker.workerId ?? worker.id;
                const isContingent = (worker.workerType?.descriptor ?? '').toLowerCase().includes('contingent');

                return {
                    id: workerId,
                    worker_id: worker.id,
                    ...(isContingent ? { contingent_worker_id: workerId } : { employee_id: workerId }),
                    ...(worker.descriptor !== undefined && { name: worker.descriptor }),
                    ...(worker.person?.email !== undefined && { email: worker.person.email }),
                    ...(worker.person?.phone !== undefined && { phone: worker.person.phone }),
                    ...(worker.primaryJob?.businessTitle !== undefined && { job_title: worker.primaryJob.businessTitle }),
                    ...(worker.primaryJob?.location?.descriptor !== undefined && { location: worker.primaryJob.location.descriptor }),
                    employment_type: isContingent ? 'Contingent Worker' : 'Employee'
                };
            });

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('Employee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
