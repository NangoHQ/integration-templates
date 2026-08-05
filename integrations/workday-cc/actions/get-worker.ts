import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';

const InputSchema = z.object({
    id: z.string().describe('Worker ID (Employee_ID or Contingent_Worker_ID). Example: "21001"')
});

// Workday's Staffing REST /workers resource doesn't expose a User_ID or an explicit active/terminated
// flag on the single-worker view — that's only filterable at the collection level via includeTerminatedWorkers.
const OutputSchema = z.object({
    id: z.string(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    user_id: z.string().optional(),
    active: z.boolean().optional()
});

const ProviderWorkerTypeSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderPersonSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    workerId: z.string().optional(),
    workerType: ProviderWorkerTypeSchema.optional(),
    person: ProviderPersonSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single worker from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/workers
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/workers/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ type: 'not_found', message: `Worker not found: ${input.id}` });
        }

        const worker = ProviderWorkerSchema.parse(response.data);
        const workerId = worker.workerId ?? worker.id;
        const isContingent = (worker.workerType?.descriptor ?? '').toLowerCase().includes('contingent');

        return {
            id: workerId,
            ...(isContingent ? { contingent_worker_id: workerId } : { employee_id: workerId }),
            ...(worker.descriptor !== undefined && { name: worker.descriptor }),
            ...(worker.person?.email !== undefined && { email: worker.person.email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
