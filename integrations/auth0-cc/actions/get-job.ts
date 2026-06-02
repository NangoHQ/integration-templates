import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    job_id: z.string().describe('ID of the job to retrieve. Example: "job_0000000000000001"')
});

const ProviderJobSummarySchema = z.object({
    failed: z.number().optional(),
    updated: z.number().optional(),
    inserted: z.number().optional(),
    total: z.number().optional()
});

const ProviderJobSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        status: z.string(),
        created_at: z.string().optional(),
        connection_id: z.string().optional(),
        location: z.string().optional(),
        percentage_done: z.number().optional(),
        time_left_seconds: z.number().optional(),
        format: z.string().optional(),
        status_details: z.string().optional(),
        summary: ProviderJobSummarySchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    connection_id: z.string().optional(),
    location: z.string().optional(),
    percentage_done: z.number().optional(),
    time_left_seconds: z.number().optional(),
    format: z.string().optional(),
    status_details: z.string().optional(),
    summary: ProviderJobSummarySchema.optional()
});

const action = createAction({
    description: 'Retrieve the status and result of a background job in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-job',
        group: 'Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:users', 'read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/jobs/get-jobs-by-id
            endpoint: `/api/v2/jobs/${encodeURIComponent(input.job_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Job not found',
                job_id: input.job_id
            });
        }

        const job = ProviderJobSchema.parse(response.data);

        return {
            id: job.id,
            type: job.type,
            status: job.status,
            ...(job.created_at !== undefined && { created_at: job.created_at }),
            ...(job.connection_id !== undefined && { connection_id: job.connection_id }),
            ...(job.location !== undefined && { location: job.location }),
            ...(job.percentage_done !== undefined && { percentage_done: job.percentage_done }),
            ...(job.time_left_seconds !== undefined && { time_left_seconds: job.time_left_seconds }),
            ...(job.format !== undefined && { format: job.format }),
            ...(job.status_details !== undefined && { status_details: job.status_details }),
            ...(job.summary !== undefined && { summary: job.summary })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
