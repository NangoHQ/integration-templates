import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the account to pause. Example: "user@example.com"')
});

const ProviderAccountSchema = z.object({
    email: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    organization: z.string().optional().nullable(),
    warmup_status: z.number().optional(),
    provider_code: z.number().optional(),
    setup_pending: z.boolean().optional(),
    is_managed_account: z.boolean().optional(),
    status: z.number().optional(),
    stat_warmup_score: z.number().optional()
});

const OutputSchema = z.object({
    email: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    organization: z.string().optional(),
    warmup_status: z.number().optional(),
    provider_code: z.number().optional(),
    setup_pending: z.boolean().optional(),
    is_managed_account: z.boolean().optional(),
    status: z.number().optional(),
    stat_warmup_score: z.number().optional()
});

const action = createAction({
    description: 'Pause an account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/pause-account'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/groups/account
            endpoint: `/v2/accounts/${encodeURIComponent(input.email)}/pause`,
            retries: 1
        });

        const providerAccount = ProviderAccountSchema.parse(response.data);

        return {
            email: providerAccount.email,
            ...(providerAccount.timestamp_created !== undefined && { timestamp_created: providerAccount.timestamp_created }),
            ...(providerAccount.timestamp_updated !== undefined && { timestamp_updated: providerAccount.timestamp_updated }),
            ...(providerAccount.first_name != null && { first_name: providerAccount.first_name }),
            ...(providerAccount.last_name != null && { last_name: providerAccount.last_name }),
            ...(providerAccount.organization != null && { organization: providerAccount.organization }),
            ...(providerAccount.warmup_status !== undefined && { warmup_status: providerAccount.warmup_status }),
            ...(providerAccount.provider_code !== undefined && { provider_code: providerAccount.provider_code }),
            ...(providerAccount.setup_pending !== undefined && { setup_pending: providerAccount.setup_pending }),
            ...(providerAccount.is_managed_account !== undefined && { is_managed_account: providerAccount.is_managed_account }),
            ...(providerAccount.status !== undefined && { status: providerAccount.status }),
            ...(providerAccount.stat_warmup_score !== undefined && { stat_warmup_score: providerAccount.stat_warmup_score })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
