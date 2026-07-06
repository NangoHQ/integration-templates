import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the account to retrieve. Example: "user@example.com"')
});

const ProviderAccountSchema = z
    .object({
        email: z.string(),
        timestamp_created: z.string(),
        timestamp_updated: z.string(),
        first_name: z.string(),
        last_name: z.string(),
        organization: z.string(),
        warmup_status: z.number(),
        provider_code: z.number(),
        setup_pending: z.boolean(),
        is_managed_account: z.boolean(),
        added_by: z.string().nullable().optional(),
        daily_limit: z.number().nullable().optional(),
        daily_limit_max: z.number().nullable().optional(),
        warmup_limit_max: z.number().nullable().optional(),
        modified_by: z.string().nullable().optional(),
        tracking_domain_name: z.string().nullable().optional(),
        tracking_domain_status: z.string().nullable().optional(),
        status: z.number().optional(),
        enable_slow_ramp: z.boolean().nullable().optional(),
        inbox_placement_test_limit: z.number().nullable().optional(),
        timestamp_last_used: z.string().nullable().optional(),
        status_message: z
            .object({
                code: z.string().optional(),
                command: z.string().optional(),
                response: z.string().optional(),
                e_message: z.string().optional(),
                responseCode: z.number().optional()
            })
            .passthrough()
            .optional(),
        timestamp_warmup_start: z.string().nullable().optional(),
        warmup_pool_id: z.string().nullable().optional(),
        dfy_password_changed: z.boolean().nullable().optional(),
        is_ready_made_account: z.boolean().nullable().optional(),
        stat_warmup_score: z.number().nullable().optional(),
        sending_gap: z.number().optional(),
        signature: z.string().nullable().optional(),
        reply_to: z.string().nullable().optional(),
        autofix_failed: z.boolean().nullable().optional(),
        warmup: z
            .object({
                limit: z.number().optional(),
                advanced: z
                    .object({
                        warm_ctd: z.boolean().optional(),
                        open_rate: z.number().optional(),
                        important_rate: z.number().optional(),
                        read_emulation: z.boolean().optional(),
                        spam_save_rate: z.number().optional(),
                        weekday_only: z.boolean().optional()
                    })
                    .passthrough()
                    .optional(),
                warmup_custom_ftag: z.string().optional(),
                increment: z.string().optional(),
                reply_rate: z.number().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = ProviderAccountSchema;

const action = createAction({
    description: 'Retrieve an email account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-account',
        method: 'GET'
    },
    scopes: ['accounts:read', 'all:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/account/get-account
            endpoint: `/v2/accounts/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found',
                email: input.email
            });
        }

        const account = ProviderAccountSchema.parse(response.data);
        return account;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
