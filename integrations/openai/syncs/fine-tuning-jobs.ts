import { createSync } from 'nango';
import { z } from 'zod';

// https://platform.openai.com/docs/api-reference/fine-tuning/list
const FineTuningJobSchema = z.object({
    id: z.string(),
    object: z.string(),
    model: z.string(),
    created_at: z.number(),
    finished_at: z.number().nullable(),
    fine_tuned_model: z.string().nullable(),
    hyperparameters: z.object({
        n_epochs: z.union([z.number(), z.string().describe('auto')]),
        batch_size: z
            .union([z.number(), z.string().describe('auto')])
            .nullable()
            .optional(),
        learning_rate_multiplier: z
            .union([z.number(), z.string().describe('auto')])
            .nullable()
            .optional()
    }),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.string(),
    validation_file: z.string().nullable().optional(),
    training_file: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.unknown().nullable().optional()
});

const FineTuningJobModelSchema = z.object({
    id: z.string(),
    object: z.string(),
    model: z.string(),
    created_at: z.number(),
    finished_at: z.number().optional(),
    fine_tuned_model: z.string().optional(),
    organization_id: z.string(),
    status: z.string(),
    training_file: z.string(),
    validation_file: z.string().optional(),
    result_files: z.array(z.string()),
    hyperparameters: z.object({
        n_epochs: z.union([z.number(), z.string()]),
        batch_size: z.union([z.number(), z.string()]).optional(),
        learning_rate_multiplier: z.union([z.number(), z.string()]).optional()
    }),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.unknown().optional()
});

const ListFineTuningJobsResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(FineTuningJobSchema),
    has_more: z.boolean()
});

const sync = createSync({
    description: 'Sync fine-tuning jobs from OpenAI',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/fine-tuning-jobs'
        }
    ],
    models: {
        FineTuningJob: FineTuningJobModelSchema
    },

    exec: async (nango) => {
        // Full refresh with delete tracking — always enumerate from page 1.
        // Resuming from a saved cursor skips earlier pages and causes trackDeletesEnd
        // to falsely delete records that were never re-seen.
        // Start delete tracking only after the first page parses successfully so a
        // network or validation failure doesn't leave tracking open without a matching end.
        let after: string | undefined = undefined;
        let hasMore = true;
        let deleteTrackingStarted = false;

        while (hasMore) {
            // https://platform.openai.com/docs/api-reference/fine-tuning/list
            const response = await nango.get({
                endpoint: '/v1/fine_tuning/jobs',
                params: {
                    limit: 20,
                    ...(after ? { after } : {})
                },
                retries: 3
            });

            const parsedJobs = ListFineTuningJobsResponseSchema.safeParse(response.data);

            if (!parsedJobs.success) {
                throw new Error(`Failed to parse fine-tuning jobs: ${parsedJobs.error.message}`);
            }

            if (!deleteTrackingStarted) {
                await nango.trackDeletesStart('FineTuningJob');
                deleteTrackingStarted = true;
            }

            const jobsArray = parsedJobs.data.data;

            const lastJobId = jobsArray[jobsArray.length - 1]?.id;

            if (jobsArray.length > 0) {
                const records = jobsArray.map((job) => ({
                    id: job.id,
                    object: job.object,
                    model: job.model,
                    created_at: job.created_at,
                    ...(job.finished_at != null && { finished_at: job.finished_at }),
                    ...(job.fine_tuned_model != null && { fine_tuned_model: job.fine_tuned_model }),
                    organization_id: job.organization_id,
                    status: job.status,
                    training_file: job.training_file,
                    ...(job.validation_file != null && { validation_file: job.validation_file }),
                    result_files: job.result_files,
                    hyperparameters: {
                        n_epochs: job.hyperparameters.n_epochs,
                        ...(job.hyperparameters.batch_size != null && {
                            batch_size: job.hyperparameters.batch_size
                        }),
                        ...(job.hyperparameters.learning_rate_multiplier != null && {
                            learning_rate_multiplier: job.hyperparameters.learning_rate_multiplier
                        })
                    },
                    ...(job.metadata != null && { metadata: job.metadata }),
                    ...(job.error != null && { error: job.error })
                }));

                await nango.batchSave(records, 'FineTuningJob');

                if (lastJobId) {
                    after = lastJobId;
                }
            }

            hasMore = parsedJobs.data.has_more;

            if (hasMore && !lastJobId) {
                throw new Error('OpenAI fine-tuning jobs pagination returned has_more=true without a cursor');
            }
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('FineTuningJob');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
