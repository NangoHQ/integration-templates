import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JobStatusTaskResultSchema = z
    .object({
        id: z.string().optional().describe('Affected or new resource identifier.'),
        error: z.string().optional().describe('Task error message.'),
        index: z.number().int().optional().describe('Unmodified provider task result index.'),
        title: z.string().optional().describe('Resource title if supplied.'),
        action: z.string().optional().describe('Attempted task action.'),
        errors: z.string().optional().describe('Plural task error text when supplied.'),
        status: z.string().optional().describe('Provider task status text.'),
        details: z.string().optional().describe('Task error details.'),
        success: z.boolean().optional().describe('Provider per-task success flag when supplied.')
    })
    .describe('Provider task result for a single affected resource.');

const JobStatusAggregateResultsSchema = z
    .object({
        success: z.boolean().describe('Aggregate success flag supplied by the provider.')
    })
    .describe('Aggregate job outcome supplied by the provider.');

const JobStatusSchema = z
    .object({
        id: z.string().describe('Opaque job status identifier.'),
        total: z.number().int().nullable().optional().describe('Total tasks or null if unknown.'),
        status: z.enum(['queued', 'working', 'failed', 'completed']).describe('Provider lifecycle state.'),
        jobType: z.string().optional().describe('Provider job type when returned.'),
        message: z.string().nullable().optional().describe('Worker message text, not an instant to parse.'),
        results: z
            .union([z.null(), JobStatusAggregateResultsSchema, z.array(JobStatusTaskResultSchema)])
            .optional()
            .describe('Provider task results, aggregate success object, or null; omitted if absent.'),
        progress: z.number().int().nullable().optional().describe('Completed tasks or null if unknown.')
    })
    .describe('Background job status record visible to agents, including progress and provider-reported task results.');

const ProviderTaskResultSchema = z.object({
    id: z.number().int().optional(),
    index: z.number().int().optional(),
    action: z.string().optional(),
    success: z.boolean().optional(),
    status: z.string().optional(),
    title: z.string().optional(),
    error: z.string().optional(),
    errors: z.string().optional(),
    details: z.string().optional()
});

const ProviderJobStatusSchema = z.object({
    id: z.string(),
    job_type: z.string().optional(),
    message: z.string().nullable().optional(),
    progress: z.number().int().nullable().optional(),
    total: z.number().int().nullable().optional(),
    status: z.enum(['queued', 'working', 'failed', 'completed']),
    results: z.union([z.null(), z.object({ success: z.boolean() }), z.array(ProviderTaskResultSchema)]).optional()
});

type ProviderJobStatus = z.infer<typeof ProviderJobStatusSchema>;
type ProviderResults = ProviderJobStatus['results'];
type JobStatusRecord = z.infer<typeof JobStatusSchema>;
type JobStatusResults = JobStatusRecord['results'];

function toTaskResult(task: z.infer<typeof ProviderTaskResultSchema>): z.infer<typeof JobStatusTaskResultSchema> {
    return {
        ...(task.id !== undefined && { id: String(task.id) }),
        ...(task.error !== undefined && { error: task.error }),
        ...(task.index !== undefined && { index: task.index }),
        ...(task.title !== undefined && { title: task.title }),
        ...(task.action !== undefined && { action: task.action }),
        ...(task.errors !== undefined && { errors: task.errors }),
        ...(task.status !== undefined && { status: task.status }),
        ...(task.details !== undefined && { details: task.details }),
        ...(task.success !== undefined && { success: task.success })
    };
}

function toResults(results: ProviderResults): JobStatusResults {
    if (results === undefined) {
        return undefined;
    }

    if (results === null) {
        return null;
    }

    if (Array.isArray(results)) {
        return results.map(toTaskResult);
    }

    return { success: results.success };
}

function toJobStatus(job: ProviderJobStatus): JobStatusRecord {
    return {
        id: job.id,
        status: job.status,
        ...(job.total !== undefined && { total: job.total }),
        ...(job.job_type !== undefined && { jobType: job.job_type }),
        ...(job.message !== undefined && { message: job.message }),
        ...(job.results !== undefined && { results: toResults(job.results) }),
        ...(job.progress !== undefined && { progress: job.progress })
    };
}

const sync = createSync({
    description: 'Background job status records visible to agents, including progress and provider-reported task results.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobStatus: JobStatusSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /api/v2/job_statuses has no changed-since filter and no
        // deleted-records endpoint, and job status data expires one day after the job
        // is created, so deletion detection runs over the whole visible dataset.
        await nango.trackDeletesStart('JobStatus');

        const config: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/ticket-management/job_statuses/#list-job-statuses
            endpoint: '/api/v2/job_statuses',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page[after]',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                limit: 100,
                response_path: 'job_statuses'
            },
            retries: 3
        };

        for await (const page of nango.paginate(config)) {
            const records = page.map((raw) => toJobStatus(ProviderJobStatusSchema.parse(raw)));

            if (records.length > 0) {
                await nango.batchSave(records, 'JobStatus');
            }
        }

        await nango.trackDeletesEnd('JobStatus');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
