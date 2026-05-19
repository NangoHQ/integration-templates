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

const CheckpointSchema = z.object({
    after: z.string()
});

const ListFineTuningJobsResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(FineTuningJobSchema),
    has_more: z.boolean()
});

const sync = createSync<{ FineTuningJob: typeof FineTuningJobModelSchema }, undefined, typeof CheckpointSchema>({
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
    checkpoint: CheckpointSchema,
    models: {
        FineTuningJob: FineTuningJobModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Jobs can change status in-place, so we keep this as a full refresh.
        // The cursor checkpoint is only used to resume a long refresh safely.
        await nango.trackDeletesStart('FineTuningJob');

        let after = checkpoint?.after;
        let hasMore = true;

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
                    await nango.saveCheckpoint({ after: lastJobId });
                    after = lastJobId;
                }
            }

            hasMore = parsedJobs.data.has_more;

            if (hasMore && !lastJobId) {
                throw new Error('OpenAI fine-tuning jobs pagination returned has_more=true without a cursor');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FineTuningJob');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
