import { z } from 'zod';
import { createAction } from 'nango';

// https://platform.openai.com/docs/api-reference/fine-tuning/create
const InputSchema = z.object({
    model: z.string().describe('The name of the model to fine-tune. Example: "gpt-4o-mini"'),
    training_file: z.string().describe('The ID of an uploaded file with purpose="fine-tune" containing training data. Example: "file-abc123"'),
    validation_file: z.string().optional().describe('The ID of an uploaded file with purpose="fine-tune" containing validation data'),
    suffix: z.string().optional().describe('A string of up to 18 characters to add to the fine-tuned model name'),
    seed: z.number().int().optional().describe('The seed for the fine-tuning job. Controls reproducibility'),
    hyperparameters: z
        .object({
            n_epochs: z.union([z.string(), z.number().int()]).optional().describe('The number of epochs to train the model for')
        })
        .optional()
        .describe('Hyperparameters for the fine-tuning job'),
    integrations: z.array(z.unknown()).optional().describe('A list of integrations to enable for the fine-tuning job')
});

// https://platform.openai.com/docs/api-reference/fine-tuning/object
const ProviderJobSchema = z.object({
    id: z.string(),
    object: z.literal('fine_tuning.job'),
    model: z.string(),
    created_at: z.number().int(),
    finished_at: z.number().int().nullable(),
    fine_tuned_model: z.string().nullable(),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.enum(['validating_files', 'queued', 'running', 'succeeded', 'failed', 'cancelled']),
    validation_file: z.string().nullable(),
    training_file: z.string(),
    parameters: z.object({}).passthrough().optional(),
    hyperparameters: z
        .object({
            n_epochs: z.union([z.string(), z.number().int()]).optional(),
            batch_size: z.union([z.string(), z.number().int()]).optional(),
            learning_rate_multiplier: z.union([z.string(), z.number()]).optional()
        })
        .optional(),
    trained_tokens: z.number().int().nullable().optional(),
    integrations: z.array(z.unknown()).nullable().optional(),
    seed: z.number().int().optional(),
    estimated_finish: z.number().int().nullable().optional(),
    error: z.object({}).passthrough().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    model: z.string(),
    created_at: z.number().int(),
    finished_at: z.number().int().optional(),
    fine_tuned_model: z.string().optional(),
    organization_id: z.string(),
    result_files: z.array(z.string()),
    status: z.enum(['validating_files', 'queued', 'running', 'succeeded', 'failed', 'cancelled']),
    validation_file: z.string().optional(),
    training_file: z.string(),
    hyperparameters: z
        .object({
            n_epochs: z.union([z.string(), z.number().int()]).optional(),
            batch_size: z.union([z.string(), z.number().int()]).optional(),
            learning_rate_multiplier: z.union([z.string(), z.number()]).optional()
        })
        .optional(),
    trained_tokens: z.number().int().optional(),
    integrations: z.array(z.unknown()).optional(),
    seed: z.number().int().optional(),
    estimated_finish: z.number().int().optional(),
    error: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Create a fine-tuning job in OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-fine-tuning-job',
        group: 'Fine-tuning'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fine_tuning.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/fine-tuning/create
        const response = await nango.post({
            endpoint: '/v1/fine_tuning/jobs',
            data: {
                model: input.model,
                training_file: input.training_file,
                ...(input.validation_file !== undefined && { validation_file: input.validation_file }),
                ...(input.suffix !== undefined && { suffix: input.suffix }),
                ...(input.seed !== undefined && { seed: input.seed }),
                ...(input.hyperparameters !== undefined && { hyperparameters: input.hyperparameters }),
                ...(input.integrations !== undefined && { integrations: input.integrations })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create fine-tuning job: empty response from API'
            });
        }

        const providerJob = ProviderJobSchema.parse(response.data);

        return {
            id: providerJob.id,
            model: providerJob.model,
            created_at: providerJob.created_at,
            ...(providerJob.finished_at != null && { finished_at: providerJob.finished_at }),
            ...(providerJob.fine_tuned_model != null && { fine_tuned_model: providerJob.fine_tuned_model }),
            organization_id: providerJob.organization_id,
            result_files: providerJob.result_files,
            status: providerJob.status,
            ...(providerJob.validation_file != null && { validation_file: providerJob.validation_file }),
            training_file: providerJob.training_file,
            ...(providerJob.hyperparameters !== undefined && { hyperparameters: providerJob.hyperparameters }),
            ...(providerJob.trained_tokens != null && { trained_tokens: providerJob.trained_tokens }),
            ...(providerJob.integrations != null && { integrations: providerJob.integrations }),
            ...(providerJob.seed !== undefined && { seed: providerJob.seed }),
            ...(providerJob.estimated_finish != null && { estimated_finish: providerJob.estimated_finish }),
            ...(providerJob.error != null && { error: providerJob.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
