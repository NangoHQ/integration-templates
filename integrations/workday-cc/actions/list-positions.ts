import { z } from 'zod';
import { createAction } from 'nango';

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

// Workday's Staffing REST API models a filled/vacant position as a "Job" resource. It doesn't
// expose an open/closed status, organization hierarchy, or pay-rate detail the way SOAP's
// Position resource did, so those fields are omitted here rather than fabricated.
const PositionSchema = z.object({
    id: z.string(),
    title: z.string(),
    job_profile_id: z.string().optional(),
    job_profile_name: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    worker_id: z.string().optional(),
    worker_name: z.string().optional(),
    inactive: z.boolean(),
    organization_id: z.string().optional(),
    organization_name: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(PositionSchema)
});

const ProviderRelatedViewSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderJobSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    businessTitle: z.string().optional(),
    location: ProviderRelatedViewSchema.optional(),
    worker: ProviderRelatedViewSchema.optional(),
    jobProfile: ProviderRelatedViewSchema.optional(),
    supervisoryOrganization: ProviderRelatedViewSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderJobSchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List positions from Workday.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        const positions: z.infer<typeof PositionSchema>[] = [];
        let offset = 0;
        let total = 0;

        do {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/jobs
            const response = await withRetry(() =>
                nango.get({
                    endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/jobs`,
                    params: { limit: PAGE_SIZE, offset },
                    retries: 3
                })
            );

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const jobs = providerResponse.data ?? [];
            total = providerResponse.total ?? jobs.length;

            for (const job of jobs) {
                positions.push({
                    id: job.id,
                    title: job.businessTitle ?? job.descriptor ?? '',
                    job_profile_id: job.jobProfile?.id,
                    job_profile_name: job.jobProfile?.descriptor,
                    location_id: job.location?.id,
                    location_name: job.location?.descriptor,
                    worker_id: job.worker?.id,
                    worker_name: job.worker?.descriptor,
                    inactive: false,
                    organization_id: job.supervisoryOrganization?.id,
                    organization_name: job.supervisoryOrganization?.descriptor
                });
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        return { items: positions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
