import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the paused account to resume. Example: "user@example.com"')
});

const ProviderWarmupAdvancedSchema = z
    .object({
        warm_ctd: z.boolean().optional(),
        open_rate: z.number().optional(),
        important_rate: z.number().optional(),
        read_emulation: z.boolean().optional(),
        spam_save_rate: z.number().optional(),
        weekday_only: z.boolean().optional()
    })
    .passthrough();

const ProviderWarmupSchema = z
    .object({
        limit: z.number().optional(),
        advanced: ProviderWarmupAdvancedSchema.optional(),
        warmup_custom_ftag: z.string().optional(),
        increment: z.string().optional(),
        reply_rate: z.number().optional()
    })
    .passthrough();

const ProviderStatusMessageSchema = z
    .object({
        code: z.string().optional(),
        command: z.string().optional(),
        response: z.string().optional(),
        e_message: z.string().optional(),
        responseCode: z.number().optional()
    })
    .passthrough();

const ProviderAccountSchema = z
    .object({
        email: z.string(),
        timestamp_created: z.string(),
        timestamp_updated: z.string(),
        first_name: z.string(),
        last_name: z.string(),
        warmup: ProviderWarmupSchema.nullable().optional(),
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
        organization: z.string(),
        timestamp_last_used: z.string().nullable().optional(),
        warmup_status: z.number(),
        status_message: ProviderStatusMessageSchema.nullable().optional(),
        timestamp_warmup_start: z.string().nullable().optional(),
        provider_code: z.number(),
        setup_pending: z.boolean(),
        warmup_pool_id: z.string().nullable().optional(),
        is_managed_account: z.boolean(),
        dfy_password_changed: z.boolean().nullable().optional(),
        is_ready_made_account: z.boolean().nullable().optional(),
        stat_warmup_score: z.number().nullable().optional(),
        sending_gap: z.number().optional(),
        signature: z.string().nullable().optional(),
        reply_to: z.string().nullable().optional(),
        autofix_failed: z.boolean().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
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
    status: z.number().optional(),
    sending_gap: z.number().optional(),
    warmup: ProviderWarmupSchema.optional(),
    status_message: ProviderStatusMessageSchema.optional(),
    added_by: z.string().optional(),
    daily_limit: z.number().optional(),
    daily_limit_max: z.number().optional(),
    warmup_limit_max: z.number().optional(),
    modified_by: z.string().optional(),
    tracking_domain_name: z.string().optional(),
    tracking_domain_status: z.string().optional(),
    enable_slow_ramp: z.boolean().optional(),
    inbox_placement_test_limit: z.number().optional(),
    timestamp_last_used: z.string().optional(),
    timestamp_warmup_start: z.string().optional(),
    warmup_pool_id: z.string().optional(),
    dfy_password_changed: z.boolean().optional(),
    is_ready_made_account: z.boolean().optional(),
    stat_warmup_score: z.number().optional(),
    signature: z.string().optional(),
    reply_to: z.string().optional(),
    autofix_failed: z.boolean().optional()
});

function normalizeAccount(providerAccount: z.infer<typeof ProviderAccountSchema>): z.infer<typeof OutputSchema> {
    const result: z.infer<typeof OutputSchema> = {
        email: providerAccount.email,
        timestamp_created: providerAccount.timestamp_created,
        timestamp_updated: providerAccount.timestamp_updated,
        first_name: providerAccount.first_name,
        last_name: providerAccount.last_name,
        organization: providerAccount.organization,
        warmup_status: providerAccount.warmup_status,
        provider_code: providerAccount.provider_code,
        setup_pending: providerAccount.setup_pending,
        is_managed_account: providerAccount.is_managed_account
    };

    if (providerAccount.status !== undefined) {
        result.status = providerAccount.status;
    }
    if (providerAccount.sending_gap !== undefined) {
        result.sending_gap = providerAccount.sending_gap;
    }

    if (providerAccount.warmup != null) {
        result.warmup = providerAccount.warmup;
    }
    if (providerAccount.status_message != null) {
        result.status_message = providerAccount.status_message;
    }
    if (providerAccount.added_by != null) {
        result.added_by = providerAccount.added_by;
    }
    if (providerAccount.daily_limit != null) {
        result.daily_limit = providerAccount.daily_limit;
    }
    if (providerAccount.daily_limit_max != null) {
        result.daily_limit_max = providerAccount.daily_limit_max;
    }
    if (providerAccount.warmup_limit_max != null) {
        result.warmup_limit_max = providerAccount.warmup_limit_max;
    }
    if (providerAccount.modified_by != null) {
        result.modified_by = providerAccount.modified_by;
    }
    if (providerAccount.tracking_domain_name != null) {
        result.tracking_domain_name = providerAccount.tracking_domain_name;
    }
    if (providerAccount.tracking_domain_status != null) {
        result.tracking_domain_status = providerAccount.tracking_domain_status;
    }
    if (providerAccount.enable_slow_ramp != null) {
        result.enable_slow_ramp = providerAccount.enable_slow_ramp;
    }
    if (providerAccount.inbox_placement_test_limit != null) {
        result.inbox_placement_test_limit = providerAccount.inbox_placement_test_limit;
    }
    if (providerAccount.timestamp_last_used != null) {
        result.timestamp_last_used = providerAccount.timestamp_last_used;
    }
    if (providerAccount.timestamp_warmup_start != null) {
        result.timestamp_warmup_start = providerAccount.timestamp_warmup_start;
    }
    if (providerAccount.warmup_pool_id != null) {
        result.warmup_pool_id = providerAccount.warmup_pool_id;
    }
    if (providerAccount.dfy_password_changed != null) {
        result.dfy_password_changed = providerAccount.dfy_password_changed;
    }
    if (providerAccount.is_ready_made_account != null) {
        result.is_ready_made_account = providerAccount.is_ready_made_account;
    }
    if (providerAccount.stat_warmup_score != null) {
        result.stat_warmup_score = providerAccount.stat_warmup_score;
    }
    if (providerAccount.signature != null) {
        result.signature = providerAccount.signature;
    }
    if (providerAccount.reply_to != null) {
        result.reply_to = providerAccount.reply_to;
    }
    if (providerAccount.autofix_failed != null) {
        result.autofix_failed = providerAccount.autofix_failed;
    }

    return result;
}

const action = createAction({
    description: 'Resume a paused account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/account/resume-a-paused-account.md
        const response = await nango.post({
            endpoint: `/v2/accounts/${encodeURIComponent(input.email)}/resume`,
            retries: 3
        });

        const providerAccount = ProviderAccountSchema.parse(response.data);

        return normalizeAccount(providerAccount);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
