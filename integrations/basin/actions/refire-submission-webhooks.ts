import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    submission_id: z.number().int().positive().describe('Submission ID. Example: 61109858')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Re-trigger the configured form webhooks for a single submission (useful for retrying a failed delivery).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/submissions/${encodeURIComponent(String(input.submission_id))}/refire_webhooks`,
            // Non-idempotent: a retry after a timeout could re-fire webhooks that already went out.
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
