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

// Workday's Staffing REST API models a filled/vacant position as a "Job" resource. It doesn't expose
// an effective date, open/closed status, or pay-rate detail the way the SOAP Position resource did.
const PositionSchema = z.object({
    id: z.string().describe('Job (position) ID'),
    name: z.string().optional().describe('Business title'),
    job_profile_id: z.string().optional().describe('Job profile reference ID'),
    job_profile_name: z.string().optional().describe('Job profile name'),
    location_id: z.string().optional().describe('Location reference ID'),
    location_name: z.string().optional().describe('Location name'),
    supervisory_org_id: z.string().optional().describe('Supervisory organization reference ID'),
    supervisory_org_name: z.string().optional().describe('Supervisory organization name'),
    worker_id: z.string().optional().describe('Assigned worker ID'),
    worker_name: z.string().optional().describe('Assigned worker name')
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

const sync = createSync({
    description: 'Sync positions from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/positions' }],
    models: {
        Position: PositionSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // Blocker: Workday's jobs resource does not support changed-since filtering.
        await nango.trackDeletesStart('Position');

        let offset = 0;
        let total = 0;

        do {
            await nango.log(`Fetching offset ${offset}`);

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

            const mapped: z.infer<typeof PositionSchema>[] = jobs.map((job) => ({
                id: job.id,
                name: job.businessTitle ?? job.descriptor ?? undefined,
                job_profile_id: job.jobProfile?.id,
                job_profile_name: job.jobProfile?.descriptor,
                location_id: job.location?.id,
                location_name: job.location?.descriptor,
                supervisory_org_id: job.supervisoryOrganization?.id,
                supervisory_org_name: job.supervisoryOrganization?.descriptor,
                worker_id: job.worker?.id,
                worker_name: job.worker?.descriptor
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Position');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('Position');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
