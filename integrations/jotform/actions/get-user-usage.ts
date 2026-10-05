import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. Usage stats are returned for the authenticated account.');

const OutputSchema = z
    .object({
        submissions: z.number().describe('Number of form submissions received during the current monthly usage period.').optional(),
        total_submissions: z.number().describe('Total number of submissions stored on the account across all forms.').optional(),
        uploads: z.number().describe('Upload storage used by submission file uploads, in bytes.').optional(),
        payments: z.number().describe('Number of payment submissions received during the current monthly usage period.').optional(),
        form_count: z.number().describe('Number of forms on the account.').optional(),
        monthly_usage_reset_date: z
            .string()
            .describe('Date and time when the monthly usage counters reset, in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-11-01 00:00:00"')
            .optional(),
        api: z.number().describe('Number of API calls counted toward the account usage limits.').optional(),
        ai_agents: z.number().describe('Number of AI agent usages counted on the account.').optional()
    })
    .describe('Current usage and quota stats for the authenticated Jotform account.');

const ProviderUsageContentSchema = z.object({
    submissions: z.union([z.string(), z.number()]).optional(),
    total_submissions: z.union([z.string(), z.number()]).optional(),
    uploads: z.union([z.string(), z.number()]).optional(),
    payments: z.union([z.string(), z.number()]).optional(),
    form_count: z.union([z.string(), z.number()]).optional(),
    monthly_usage_reset_date: z.string().optional(),
    api: z.union([z.string(), z.number()]).optional(),
    ai_agents: z.union([z.string(), z.number()]).optional()
});

const ProviderResponseSchema = z.object({
    content: ProviderUsageContentSchema
});

function toCount(value: string | number): number {
    return Number(value);
}

/**
 * @tags: [read]
 * @tagReason: Only reads the authenticated account's usage and quota counters; no provider state is mutated.
 * @pitfalls: The monthly submissions counter keeps counting submissions that are later deleted, so it can exceed total_submissions, which only reflects submissions still stored on the account. monthly_usage_reset_date carries no timezone offset, so the exact reset instant is ambiguous.
 */
const action = createAction({
    description:
        "Retrieve the authenticated account's current usage/quota stats (submissions, uploads, payments, API calls, and form count) for the current billing period.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/#user-usage
        const response = await nango.get({
            endpoint: '/user/usage',
            retries: 3
        });

        const usage = ProviderResponseSchema.parse(response.data).content;

        return {
            ...(usage.submissions !== undefined && { submissions: toCount(usage.submissions) }),
            ...(usage.total_submissions !== undefined && { total_submissions: toCount(usage.total_submissions) }),
            ...(usage.uploads !== undefined && { uploads: toCount(usage.uploads) }),
            ...(usage.payments !== undefined && { payments: toCount(usage.payments) }),
            ...(usage.form_count !== undefined && { form_count: toCount(usage.form_count) }),
            ...(usage.monthly_usage_reset_date !== undefined && { monthly_usage_reset_date: usage.monthly_usage_reset_date }),
            ...(usage.api !== undefined && { api: toCount(usage.api) }),
            ...(usage.ai_agents !== undefined && { ai_agents: toCount(usage.ai_agents) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
