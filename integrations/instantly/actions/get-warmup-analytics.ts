import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z
        .array(z.string().describe('Email address attached to an account in the workspace. Example: "user@example.com"'))
        .min(1)
        .max(100)
        .describe('List of emails to get warmup analytics for. The emails should be attached to accounts in your workspace.')
});

const EmailDateMetricsSchema = z.object({
    sent: z.number().optional(),
    landed_inbox: z.number().optional(),
    landed_spam: z.number().optional(),
    received: z.number().optional()
});

const AggregateMetricsSchema = z.object({
    sent: z.number().optional(),
    received: z.number().optional(),
    landed_inbox: z.number().optional(),
    landed_spam: z.number().optional(),
    health_score_label: z.string().optional(),
    health_score: z.number().optional()
});

const OutputSchema = z.object({
    email_date_data: z.record(z.string(), z.record(z.string(), EmailDateMetricsSchema)).optional(),
    aggregate_data: z.record(z.string(), AggregateMetricsSchema).optional()
});

const action = createAction({
    description: 'Get warmup analytics for email accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:read'],
    endpoint: {
        path: '/actions/get-warmup-analytics',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/account/get-warmup-analytics
            endpoint: '/v2/accounts/warmup-analytics',
            data: {
                emails: input.emails
            },
            retries: 3
        });

        const data = OutputSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
