import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset. Omit for the first page.')
});

// Workday's Staffing REST /workers resource doesn't expose hire/termination dates, manager,
// department, or cost-center references the way the SOAP Get_Workers response did.
const WorkerSchema = z.object({
    id: z.string(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    worker_type: z.string().optional(),
    business_title: z.string().optional(),
    job_profile: z.string().optional(),
    location: z.string().optional(),
    is_active: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkerSchema),
    next_cursor: z.string().optional()
});

const ProviderRelatedViewSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderPrimaryJobSchema = z.object({
    businessTitle: z.string().optional(),
    jobProfile: ProviderRelatedViewSchema.optional(),
    location: ProviderRelatedViewSchema.optional()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    workerId: z.string().optional(),
    workerType: ProviderRelatedViewSchema.optional(),
    person: z.object({ email: z.string().optional(), phone: z.string().optional() }).optional(),
    primaryJob: ProviderPrimaryJobSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderWorkerSchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List workers from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/workers
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/workers`,
            params: { limit: PAGE_SIZE, offset, includeTerminatedWorkers: 'true' },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = (providerResponse.data ?? []).map((worker) => {
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
                ...(worker.primaryJob?.jobProfile?.descriptor !== undefined && { job_profile: worker.primaryJob.jobProfile.descriptor }),
                ...(worker.primaryJob?.location?.descriptor !== undefined && { location: worker.primaryJob.location.descriptor })
            };
        });

        const total = providerResponse.total ?? offset + items.length;
        const hasMoreData = offset + items.length < total;

        return {
            items,
            ...(hasMoreData && { next_cursor: String(offset + PAGE_SIZE) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
