import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderJobSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional().nullable(),
    businessTitle: z.string().optional().nullable()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional().nullable(),
    workerId: z.string().optional().nullable(),
    primaryJob: ProviderJobSchema.optional().nullable(),
    additionalJobs: z.array(ProviderJobSchema).optional().nullable()
});

const WorkerSchema = z
    .object({
        id: z.string().describe('Opaque worker API identifier.'),
        jobTitle: z.string().optional().describe('Current job title when explicitly returned and unambiguous; otherwise omitted.'),
        descriptor: z.string().optional().describe('Worker display text; omitted when unavailable.'),
        employeeId: z.string().optional().describe('Employee reference identifier distinct from the API ID; omitted when unavailable.')
    })
    .describe('A Workday worker record with available current staffing information.');

// Full refresh. The pinned Staffing API operation GET /workers supports only
// limit/offset query parameters on a live collection: there is no changed-since
// filter, delta feed, deleted-records endpoint, or resumable cursor, so no
// checkpoint can change the request. Delete-tracked scans must restart from the
// first page, so the run always walks the full dataset from offset 0.
const sync = createSync({
    description: 'Make workers and their available current staffing information available as a replicated dataset.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Worker: WorkerSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const parsedConfig = z
            .object({
                tenant: z.string().min(1)
            })
            .safeParse(connection.connection_config);
        if (!parsedConfig.success) {
            throw new Error('Missing tenant in connection config');
        }
        const tenant = parsedConfig.data.tenant;

        await nango.trackDeletesStart('Worker');

        const proxyConfig: ProxyConfiguration = {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
            endpoint: `/staffing/v5/${encodeURIComponent(tenant)}/workers`,
            params: { limit: 100, offset: 0 },
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        const parsed = z.array(ProviderWorkerSchema).safeParse(response.data?.data);
        if (!parsed.success) {
            // Inside a delete-tracked scan a skipped record would be falsely
            // marked deleted, so a malformed page must fail the whole run.
            throw new Error(`Failed to parse workers page: ${parsed.error.message}`);
        }

        const workers = parsed.data.map((worker) => {
            const hasAdditionalJobs = worker.additionalJobs != null && worker.additionalJobs.length > 0;
            const businessTitle = worker.primaryJob?.businessTitle;
            return {
                id: worker.id,
                ...(!hasAdditionalJobs && businessTitle != null && { jobTitle: businessTitle }),
                ...(worker.descriptor != null && { descriptor: worker.descriptor }),
                ...(worker.workerId != null && { employeeId: worker.workerId })
            };
        });

        if (workers.length > 0) {
            await nango.batchSave(workers, 'Worker');
        }

        await nango.trackDeletesEnd('Worker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
