import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fine_tuning_job_id: z.string().describe('Fine-tuning job ID. Example: "ftjob-abc123"')
});

const FineTuningJobSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_at: z.number(),
    finished_at: z.number().nullable(),
    model: z.string(),
    fine_tuned_model: z.string().nullable(),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.enum(['validating_files', 'queued', 'running', 'succeeded', 'failed', 'cancelled']),
    validation_file: z.string().nullable(),
    training_file: z.string(),
    hyperparameters: z.object({
        n_epochs: z.union([z.number(), z.string()]).nullable()
    }),
    trained_tokens: z.number().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.enum(['validating_files', 'queued', 'running', 'succeeded', 'failed', 'cancelled']),
    model: z.string(),
    fine_tuned_model: z.string().optional(),
    training_file: z.string(),
    result_files: z.array(z.string()),
    trained_tokens: z.number().optional(),
    created_at: z.number(),
    finished_at: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single fine-tuning job from OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-fine-tuning-job',
        group: 'Fine-tuning'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fine_tuning.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/fine-tuning/get
        const response = await nango.get({
            endpoint: `/v1/fine_tuning/jobs/${encodeURIComponent(input.fine_tuning_job_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Fine-tuning job not found',
                fine_tuning_job_id: input.fine_tuning_job_id
            });
        }

        const job = FineTuningJobSchema.parse(response.data);

        return {
            id: job.id,
            status: job.status,
            model: job.model,
            training_file: job.training_file,
            result_files: job.result_files,
            created_at: job.created_at,
            ...(job.fine_tuned_model != null && { fine_tuned_model: job.fine_tuned_model }),
            ...(job.finished_at != null && { finished_at: job.finished_at }),
            ...(job.trained_tokens != null && { trained_tokens: job.trained_tokens })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
