import { z } from 'zod';
import { createAction } from 'nango';

const WarmupAdvancedSchema = z.object({
    warm_ctd: z.boolean().optional(),
    open_rate: z.number().optional(),
    important_rate: z.number().optional(),
    read_emulation: z.boolean().optional(),
    spam_save_rate: z.number().optional(),
    weekday_only: z.boolean().optional()
});

const WarmupSchema = z.object({
    limit: z.number().optional(),
    advanced: WarmupAdvancedSchema.optional(),
    warmup_custom_ftag: z.string().optional(),
    increment: z.enum(['disabled', '0', '1', '2', '3', '4']).optional(),
    reply_rate: z.number().optional()
});

const InputSchema = z.object({
    email: z.string().describe('The email address of the account to patch. Example: "user@example.com"'),
    first_name: z.string().optional().describe('First name associated with the account'),
    last_name: z.string().optional().describe('Last name associated with the account'),
    warmup: WarmupSchema.optional().describe('Warmup configuration for the account'),
    daily_limit: z.number().nullable().optional().describe('Daily email sending limit'),
    tracking_domain_name: z.string().nullable().optional().describe('Tracking domain'),
    tracking_domain_status: z.string().nullable().optional().describe('Tracking domain status'),
    enable_slow_ramp: z.boolean().nullable().optional().describe('Whether to enable slow ramp up for sending limits'),
    inbox_placement_test_limit: z.number().nullable().optional().describe('The limit for inbox placement tests'),
    sending_gap: z.number().min(0).max(1440).optional().describe('The gap between emails sent from this account in minutes'),
    signature: z.string().nullable().optional().describe('Email signature for the account'),
    reply_to: z.string().nullable().optional().describe('Custom reply-to email address for the account'),
    skip_cname_check: z.boolean().optional().describe('Whether to skip CNAME check'),
    remove_tracking_domain: z.boolean().optional().describe('Whether to remove the tracking domain')
});

const ProviderStatusMessageSchema = z
    .object({
        code: z.string().optional(),
        command: z.string().optional(),
        response: z.string().optional(),
        e_message: z.string().optional(),
        responseCode: z.number().optional()
    })
    .passthrough();

const ProviderAccountSchema = z.object({
    email: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    warmup: WarmupSchema.nullable().optional(),
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
    warmup_status: z.number().optional(),
    status_message: ProviderStatusMessageSchema.nullable().optional(),
    timestamp_warmup_start: z.string().nullable().optional(),
    provider_code: z.number().optional(),
    setup_pending: z.boolean().optional(),
    warmup_pool_id: z.string().nullable().optional(),
    is_managed_account: z.boolean().optional(),
    dfy_password_changed: z.boolean().nullable().optional(),
    is_ready_made_account: z.boolean().nullable().optional(),
    stat_warmup_score: z.number().nullable().optional(),
    sending_gap: z.number().optional(),
    signature: z.string().nullable().optional(),
    reply_to: z.string().nullable().optional(),
    autofix_failed: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    email: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    organization: z.string(),
    warmup: WarmupSchema.optional(),
    added_by: z.string().optional(),
    daily_limit: z.number().optional(),
    daily_limit_max: z.number().optional(),
    warmup_limit_max: z.number().optional(),
    modified_by: z.string().optional(),
    tracking_domain_name: z.string().optional(),
    tracking_domain_status: z.string().optional(),
    status: z.number().optional(),
    enable_slow_ramp: z.boolean().optional(),
    inbox_placement_test_limit: z.number().optional(),
    timestamp_last_used: z.string().optional(),
    warmup_status: z.number().optional(),
    status_message: ProviderStatusMessageSchema.optional(),
    timestamp_warmup_start: z.string().optional(),
    provider_code: z.number().optional(),
    setup_pending: z.boolean().optional(),
    warmup_pool_id: z.string().optional(),
    is_managed_account: z.boolean().optional(),
    dfy_password_changed: z.boolean().optional(),
    is_ready_made_account: z.boolean().optional(),
    stat_warmup_score: z.number().optional(),
    sending_gap: z.number().optional(),
    signature: z.string().optional(),
    reply_to: z.string().optional(),
    autofix_failed: z.boolean().optional()
});

const action = createAction({
    description: 'Patch an email account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:update', 'accounts:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: {
            first_name?: string;
            last_name?: string;
            warmup?: z.infer<typeof WarmupSchema>;
            daily_limit?: number | null;
            tracking_domain_name?: string | null;
            tracking_domain_status?: string | null;
            enable_slow_ramp?: boolean | null;
            inbox_placement_test_limit?: number | null;
            sending_gap?: number;
            signature?: string | null;
            reply_to?: string | null;
            skip_cname_check?: boolean;
            remove_tracking_domain?: boolean;
        } = {};

        if (input.first_name !== undefined) {
            payload.first_name = input.first_name;
        }
        if (input.last_name !== undefined) {
            payload.last_name = input.last_name;
        }
        if (input.warmup !== undefined) {
            payload.warmup = input.warmup;
        }
        if (input.daily_limit !== undefined) {
            payload.daily_limit = input.daily_limit;
        }
        if (input.tracking_domain_name !== undefined) {
            payload.tracking_domain_name = input.tracking_domain_name;
        }
        if (input.tracking_domain_status !== undefined) {
            payload.tracking_domain_status = input.tracking_domain_status;
        }
        if (input.enable_slow_ramp !== undefined) {
            payload.enable_slow_ramp = input.enable_slow_ramp;
        }
        if (input.inbox_placement_test_limit !== undefined) {
            payload.inbox_placement_test_limit = input.inbox_placement_test_limit;
        }
        if (input.sending_gap !== undefined) {
            payload.sending_gap = input.sending_gap;
        }
        if (input.signature !== undefined) {
            payload.signature = input.signature;
        }
        if (input.reply_to !== undefined) {
            payload.reply_to = input.reply_to;
        }
        if (input.skip_cname_check !== undefined) {
            payload.skip_cname_check = input.skip_cname_check;
        }
        if (input.remove_tracking_domain !== undefined) {
            payload.remove_tracking_domain = input.remove_tracking_domain;
        }

        if (Object.keys(payload).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to patch must be provided.'
            });
        }

        const response = await nango.patch({
            // https://developer.instantly.ai/api-reference/account/patch-account
            endpoint: `/v2/accounts/${encodeURIComponent(input.email)}`,
            data: payload,
            retries: 3
        });

        const providerAccount = ProviderAccountSchema.parse(response.data);

        return {
            email: providerAccount.email,
            timestamp_created: providerAccount.timestamp_created,
            timestamp_updated: providerAccount.timestamp_updated,
            first_name: providerAccount.first_name,
            last_name: providerAccount.last_name,
            organization: providerAccount.organization,
            ...(providerAccount.warmup != null && { warmup: providerAccount.warmup }),
            ...(providerAccount.added_by != null && { added_by: providerAccount.added_by }),
            ...(providerAccount.daily_limit != null && { daily_limit: providerAccount.daily_limit }),
            ...(providerAccount.daily_limit_max != null && { daily_limit_max: providerAccount.daily_limit_max }),
            ...(providerAccount.warmup_limit_max != null && { warmup_limit_max: providerAccount.warmup_limit_max }),
            ...(providerAccount.modified_by != null && { modified_by: providerAccount.modified_by }),
            ...(providerAccount.tracking_domain_name != null && { tracking_domain_name: providerAccount.tracking_domain_name }),
            ...(providerAccount.tracking_domain_status != null && { tracking_domain_status: providerAccount.tracking_domain_status }),
            ...(providerAccount.status != null && { status: providerAccount.status }),
            ...(providerAccount.enable_slow_ramp != null && { enable_slow_ramp: providerAccount.enable_slow_ramp }),
            ...(providerAccount.inbox_placement_test_limit != null && { inbox_placement_test_limit: providerAccount.inbox_placement_test_limit }),
            ...(providerAccount.timestamp_last_used != null && { timestamp_last_used: providerAccount.timestamp_last_used }),
            ...(providerAccount.warmup_status != null && { warmup_status: providerAccount.warmup_status }),
            ...(providerAccount.status_message != null && { status_message: providerAccount.status_message }),
            ...(providerAccount.timestamp_warmup_start != null && { timestamp_warmup_start: providerAccount.timestamp_warmup_start }),
            ...(providerAccount.provider_code != null && { provider_code: providerAccount.provider_code }),
            ...(providerAccount.setup_pending != null && { setup_pending: providerAccount.setup_pending }),
            ...(providerAccount.warmup_pool_id != null && { warmup_pool_id: providerAccount.warmup_pool_id }),
            ...(providerAccount.is_managed_account != null && { is_managed_account: providerAccount.is_managed_account }),
            ...(providerAccount.dfy_password_changed != null && { dfy_password_changed: providerAccount.dfy_password_changed }),
            ...(providerAccount.is_ready_made_account != null && { is_ready_made_account: providerAccount.is_ready_made_account }),
            ...(providerAccount.stat_warmup_score != null && { stat_warmup_score: providerAccount.stat_warmup_score }),
            ...(providerAccount.sending_gap != null && { sending_gap: providerAccount.sending_gap }),
            ...(providerAccount.signature != null && { signature: providerAccount.signature }),
            ...(providerAccount.reply_to != null && { reply_to: providerAccount.reply_to }),
            ...(providerAccount.autofix_failed != null && { autofix_failed: providerAccount.autofix_failed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
