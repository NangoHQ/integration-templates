import { z } from 'zod';
import { createAction } from 'nango';

const WarmupAdvancedInputSchema = z.object({
    warm_ctd: z.boolean().optional(),
    open_rate: z.number().optional(),
    important_rate: z.number().optional(),
    read_emulation: z.boolean().optional(),
    spam_save_rate: z.number().optional(),
    weekday_only: z.boolean().optional()
});

const WarmupInputSchema = z.object({
    limit: z.number().optional(),
    advanced: WarmupAdvancedInputSchema.optional(),
    warmup_custom_ftag: z.string().optional(),
    increment: z.enum(['disabled', '0', '1', '2', '3', '4']).optional(),
    reply_rate: z.number().optional()
});

const InputSchema = z.object({
    email: z.string().describe('Email address of the account. Example: "user@example.com"'),
    first_name: z.string().describe('First name associated with the account. Example: "John"'),
    last_name: z.string().describe('Last name associated with the account. Example: "Doe"'),
    provider_code: z.number().describe('Provider code: 1=Custom IMAP/SMTP, 2=Google, 3=Microsoft, 4=AWS, 8=AirMail'),
    imap_username: z.string().describe('IMAP username. Example: "username"'),
    imap_password: z.string().describe('IMAP password. Example: "password"'),
    imap_host: z.string().describe('IMAP host. Example: "imap.gmail.com"'),
    imap_port: z.number().describe('IMAP port. Example: 993'),
    smtp_username: z.string().describe('SMTP username. Example: "username"'),
    smtp_password: z.string().describe('SMTP password. Example: "password"'),
    smtp_host: z.string().describe('SMTP host. Example: "smtp.gmail.com"'),
    smtp_port: z.number().describe('SMTP port. Example: 587'),
    daily_limit: z.number().nullable().optional(),
    tracking_domain_name: z.string().nullable().optional(),
    tracking_domain_status: z.string().nullable().optional(),
    enable_slow_ramp: z.boolean().nullable().optional(),
    inbox_placement_test_limit: z.number().nullable().optional(),
    sending_gap: z.number().optional(),
    signature: z.string().nullable().optional(),
    reply_to: z.string().nullable().optional(),
    warmup: WarmupInputSchema.optional(),
    skip_cname_check: z.boolean().optional()
});

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
    increment: z.string().optional(),
    reply_rate: z.number().optional()
});

const StatusMessageSchema = z
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
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    first_name: z.string(),
    last_name: z.string(),
    warmup: WarmupSchema.optional(),
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
    organization: z.string().optional(),
    timestamp_last_used: z.string().nullable().optional(),
    warmup_status: z.number().optional(),
    status_message: StatusMessageSchema.optional(),
    timestamp_warmup_start: z.string().nullable().optional(),
    provider_code: z.number(),
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
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    first_name: z.string(),
    last_name: z.string(),
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
    organization: z.string().optional(),
    timestamp_last_used: z.string().optional(),
    warmup_status: z.number().optional(),
    status_message: StatusMessageSchema.optional(),
    timestamp_warmup_start: z.string().optional(),
    provider_code: z.number(),
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
    description: 'Create an email account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:create'],
    endpoint: {
        method: 'POST',
        path: '/actions/create-account'
    },
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/account/create-account
            endpoint: '/v2/accounts',
            data: {
                email: input.email,
                first_name: input.first_name,
                last_name: input.last_name,
                provider_code: input.provider_code,
                imap_username: input.imap_username,
                imap_password: input.imap_password,
                imap_host: input.imap_host,
                imap_port: input.imap_port,
                smtp_username: input.smtp_username,
                smtp_password: input.smtp_password,
                smtp_host: input.smtp_host,
                smtp_port: input.smtp_port,
                ...(input.daily_limit !== undefined && { daily_limit: input.daily_limit }),
                ...(input.tracking_domain_name !== undefined && { tracking_domain_name: input.tracking_domain_name }),
                ...(input.tracking_domain_status !== undefined && { tracking_domain_status: input.tracking_domain_status }),
                ...(input.enable_slow_ramp !== undefined && { enable_slow_ramp: input.enable_slow_ramp }),
                ...(input.inbox_placement_test_limit !== undefined && { inbox_placement_test_limit: input.inbox_placement_test_limit }),
                ...(input.sending_gap !== undefined && { sending_gap: input.sending_gap }),
                ...(input.signature !== undefined && { signature: input.signature }),
                ...(input.reply_to !== undefined && { reply_to: input.reply_to }),
                ...(input.warmup !== undefined && { warmup: input.warmup }),
                ...(input.skip_cname_check !== undefined && { skip_cname_check: input.skip_cname_check })
            },
            retries: 3
        });

        const account = ProviderAccountSchema.parse(response.data);

        return {
            email: account.email,
            ...(account.timestamp_created !== undefined && { timestamp_created: account.timestamp_created }),
            ...(account.timestamp_updated !== undefined && { timestamp_updated: account.timestamp_updated }),
            first_name: account.first_name,
            last_name: account.last_name,
            ...(account.warmup !== undefined && { warmup: account.warmup }),
            ...(account.added_by != null && { added_by: account.added_by }),
            ...(account.daily_limit != null && { daily_limit: account.daily_limit }),
            ...(account.daily_limit_max != null && { daily_limit_max: account.daily_limit_max }),
            ...(account.warmup_limit_max != null && { warmup_limit_max: account.warmup_limit_max }),
            ...(account.modified_by != null && { modified_by: account.modified_by }),
            ...(account.tracking_domain_name != null && { tracking_domain_name: account.tracking_domain_name }),
            ...(account.tracking_domain_status != null && { tracking_domain_status: account.tracking_domain_status }),
            ...(account.status !== undefined && { status: account.status }),
            ...(account.enable_slow_ramp != null && { enable_slow_ramp: account.enable_slow_ramp }),
            ...(account.inbox_placement_test_limit != null && { inbox_placement_test_limit: account.inbox_placement_test_limit }),
            ...(account.organization !== undefined && { organization: account.organization }),
            ...(account.timestamp_last_used != null && { timestamp_last_used: account.timestamp_last_used }),
            ...(account.warmup_status !== undefined && { warmup_status: account.warmup_status }),
            ...(account.status_message !== undefined && { status_message: account.status_message }),
            ...(account.timestamp_warmup_start != null && { timestamp_warmup_start: account.timestamp_warmup_start }),
            provider_code: account.provider_code,
            ...(account.setup_pending !== undefined && { setup_pending: account.setup_pending }),
            ...(account.warmup_pool_id != null && { warmup_pool_id: account.warmup_pool_id }),
            ...(account.is_managed_account !== undefined && { is_managed_account: account.is_managed_account }),
            ...(account.dfy_password_changed != null && { dfy_password_changed: account.dfy_password_changed }),
            ...(account.is_ready_made_account != null && { is_ready_made_account: account.is_ready_made_account }),
            ...(account.stat_warmup_score != null && { stat_warmup_score: account.stat_warmup_score }),
            ...(account.sending_gap !== undefined && { sending_gap: account.sending_gap }),
            ...(account.signature != null && { signature: account.signature }),
            ...(account.reply_to != null && { reply_to: account.reply_to }),
            ...(account.autofix_failed != null && { autofix_failed: account.autofix_failed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
