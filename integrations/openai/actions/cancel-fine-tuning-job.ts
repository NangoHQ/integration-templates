import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fine_tuning_job_id: z.string().describe('The ID of the fine-tuning job to cancel. Example: "ft-abc123"')
});

const ProviderFineTuningJobSchema = z.object({
    id: z.string(),
    object: z.literal('fine_tuning.job'),
    model: z.string(),
    created_at: z.number(),
    finished_at: z.number().nullable().optional(),
    fine_tuned_model: z.string().nullable().optional(),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.string(),
    validation_file: z.string().nullable().optional(),
    training_file: z.string(),
    hyperparameters: z.object({
        n_epochs: z.number().or(z.literal('auto')).optional(),
        batch_size: z.number().or(z.literal('auto')).optional(),
        learning_rate_multiplier: z.number().or(z.literal('auto')).optional()
    }),
    trained_tokens: z.number().nullable().optional(),
    error: z.unknown().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    model: z.string(),
    created_at: z.number(),
    finished_at: z.number().optional(),
    fine_tuned_model: z.string().optional(),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.string(),
    validation_file: z.string().optional(),
    training_file: z.string(),
    hyperparameters: z.object({
        n_epochs: z.number().or(z.literal('auto')).optional(),
        batch_size: z.number().or(z.literal('auto')).optional(),
        learning_rate_multiplier: z.number().or(z.literal('auto')).optional()
    }),
    trained_tokens: z.number().optional(),
    error: z.unknown().optional()
});

const action = createAction({
    description: 'Cancel an OpenAI fine-tuning job.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-fine-tuning-job',
        group: 'Fine-tuning'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fine_tuning.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/fine-tuning/cancel
        const response = await nango.post({
            endpoint: `/v1/fine_tuning/jobs/${encodeURIComponent(input.fine_tuning_job_id)}/cancel`,
            retries: 3
        });

        const providerJob = ProviderFineTuningJobSchema.parse(response.data);

        return {
            id: providerJob.id,
            object: providerJob.object,
            model: providerJob.model,
            created_at: providerJob.created_at,
            ...(providerJob.finished_at != null && { finished_at: providerJob.finished_at }),
            ...(providerJob.fine_tuned_model != null && { fine_tuned_model: providerJob.fine_tuned_model }),
            organization_id: providerJob.organization_id,
            result_files: providerJob.result_files,
            status: providerJob.status,
            ...(providerJob.validation_file != null && { validation_file: providerJob.validation_file }),
            training_file: providerJob.training_file,
            hyperparameters: providerJob.hyperparameters,
            ...(providerJob.trained_tokens != null && { trained_tokens: providerJob.trained_tokens }),
            ...(providerJob.error != null && { error: providerJob.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
