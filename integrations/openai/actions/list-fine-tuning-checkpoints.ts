import { z } from 'zod';
import { createAction } from 'nango';

const CheckpointMetricsSchema = z.object({
    step: z.number().optional(),
    train_loss: z.number().optional(),
    train_mean_token_accuracy: z.number().optional(),
    valid_loss: z.number().optional(),
    valid_mean_token_accuracy: z.number().optional(),
    full_valid_loss: z.number().optional(),
    full_valid_mean_token_accuracy: z.number().optional()
});

const CheckpointSchema = z.object({
    id: z.string(),
    created_at: z.number(),
    fine_tuned_model_checkpoint: z.string(),
    step_number: z.number(),
    metrics: CheckpointMetricsSchema,
    fine_tuning_job_id: z.string()
});

const InputSchema = z.object({
    fine_tuning_job_id: z.string().describe('The ID of the fine-tuning job. Example: "ftjob-abc123"'),
    after: z.string().optional().describe('Pagination cursor for the next page. Use the last checkpoint ID from the previous response.'),
    limit: z.number().min(1).max(100).optional().describe('Number of checkpoints to return (1-100). Default is 10.')
});

const OutputSchema = z.object({
    data: z.array(CheckpointSchema).describe('List of checkpoints for the fine-tuning job'),
    after: z.string().optional().describe('Cursor for the next page of results. Use this value as the after parameter in subsequent requests.')
});

const action = createAction({
    description: 'List checkpoints saved during a fine-tuning job',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-fine-tuning-checkpoints',
        group: 'Fine-tuning'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fine_tuning.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://platform.openai.com/docs/api-reference/fine-tuning/list-checkpoints
            endpoint: `/v1/fine_tuning/jobs/${encodeURIComponent(input.fine_tuning_job_id)}/checkpoints`,
            params: {
                limit: input.limit ?? 10,
                ...(input.after !== undefined && { after: input.after })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                has_more: z.boolean().optional(),
                last_id: z.string().optional()
            })
            .parse(response.data);

        const checkpoints = providerResponse.data.map((item: unknown) => {
            const parsed = CheckpointSchema.parse(item);
            return {
                id: parsed.id,
                created_at: parsed.created_at,
                fine_tuned_model_checkpoint: parsed.fine_tuned_model_checkpoint,
                step_number: parsed.step_number,
                metrics: parsed.metrics,
                fine_tuning_job_id: parsed.fine_tuning_job_id
            };
        });

        // For pagination, use the last checkpoint ID as the next cursor
        // OpenAI uses the last_id field or we derive from the last item
        const lastCheckpoint = checkpoints[checkpoints.length - 1];
        const nextAfter = providerResponse.last_id ?? (lastCheckpoint !== undefined ? lastCheckpoint.id : undefined);

        return {
            data: checkpoints,
            ...(nextAfter !== undefined && { after: nextAfter })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
