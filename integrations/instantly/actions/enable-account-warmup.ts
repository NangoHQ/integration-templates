import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z
        .array(z.string().email())
        .min(1)
        .max(100)
        .describe('List of emails to enable warmup accounts for. The emails should be attached to accounts in your workspace.')
});

const BackgroundJobSchema = z.object({
    id: z.string().describe('Unique identifier for the background job'),
    workspace_id: z.string().describe('Workspace ID'),
    user_id: z.string().nullish().describe('The id of the user that triggered the action that created the job'),
    type: z.string().describe('Type of background job'),
    entity_id: z.string().nullish().describe('The id of the entity that the job is related to'),
    entity_type: z.string().nullish().describe('Type of entity'),
    data: z.record(z.string(), z.unknown()).optional().describe('Data about the job'),
    progress: z.number().min(0).max(100).describe('Progress of the job as a percentage (from 0 to 100)'),
    status: z.enum(['pending', 'in-progress', 'success', 'failed', 'draining', 'paused', 'cancelled']).describe('Job status'),
    created_at: z.string().describe('Timestamp when the job was created'),
    updated_at: z.string().describe('Timestamp when the job was last updated')
});

const OutputSchema = z.object({
    job_id: z.string().describe('Unique identifier for the background job'),
    status: z.string().describe('Final job status'),
    progress: z.number().min(0).max(100).describe('Progress of the job as a percentage'),
    type: z.string().describe('Type of background job'),
    created_at: z.string().describe('Timestamp when the job was created'),
    updated_at: z.string().describe('Timestamp when the job was last updated')
});

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

const action = createAction({
    description: 'Enable warmup for accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:update', 'accounts:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const postResponse = await nango.post({
            // https://developer.instantly.ai/api-reference/account/enable-warmup-for-accounts
            endpoint: '/v2/accounts/warmup/enable',
            data: {
                emails: input.emails
            },
            retries: 3
        });

        const job = BackgroundJobSchema.parse(postResponse.data);

        let currentJob = job;
        let attempts = 0;

        while (currentJob.status !== 'success' && currentJob.status !== 'failed' && attempts < MAX_POLL_ATTEMPTS) {
            await new Promise((resolve) => {
                setTimeout(resolve, POLL_INTERVAL_MS);
            });

            const getResponse = await nango.get({
                // https://developer.instantly.ai/api-reference/backgroundjob/get-background-job
                endpoint: `/v2/background-jobs/${encodeURIComponent(currentJob.id)}`,
                retries: 3
            });

            currentJob = BackgroundJobSchema.parse(getResponse.data);
            attempts = attempts + 1;
        }

        if (currentJob.status !== 'success' && currentJob.status !== 'failed') {
            throw new nango.ActionError({
                type: 'timeout',
                message: 'Background job did not complete within the expected polling window.',
                job_id: currentJob.id,
                status: currentJob.status,
                progress: currentJob.progress
            });
        }

        if (currentJob.status === 'failed') {
            throw new nango.ActionError({
                type: 'job_failed',
                message: 'Background job to enable warmup failed.',
                job_id: currentJob.id,
                progress: currentJob.progress
            });
        }

        return {
            job_id: currentJob.id,
            status: currentJob.status,
            progress: currentJob.progress,
            type: currentJob.type,
            created_at: currentJob.created_at,
            updated_at: currentJob.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
