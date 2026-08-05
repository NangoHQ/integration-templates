import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.number().describe('User ID. Example: 843757'),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    mobile_number: z.string().optional(),
    team_id: z.number().optional(),
    manager_id: z.number().optional(),
    level: z.number().optional(),
    name: z.string().optional(),
    is_account_admin: z.boolean().optional(),
    read_only: z.boolean().optional(),
    mfa_enabled: z.boolean().optional(),
    time_zone: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.string().optional(),
    is_allowed_to_export: z.boolean().optional(),
    is_allowed_to_delete: z.boolean().optional(),
    is_allowed_to_send_campaigns: z.boolean().optional(),
    is_allowed_to_merge_records: z.boolean().optional(),
    is_google_apps_enabled: z.boolean().optional(),
    csv_column_separator: z.string().optional(),
    csv_decimal_mark: z.string().optional(),
    pipeline_email_client: z.boolean().optional()
});

const ProviderCurrencySchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    code: z.string().optional(),
    symbol: z.string().optional(),
    decimal_places: z.number().optional()
});

const ProviderOtherEmailSchema = z.object({
    id: z.number(),
    email: z.string()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    account_id: z.number().nullable().optional(),
    full_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    mobile_number: z.string().nullable().optional(),
    team_id: z.number().nullable().optional(),
    manager_id: z.number().nullable().optional(),
    level: z.number().nullable().optional(),
    is_account_admin: z.boolean().nullable().optional(),
    read_only: z.boolean().nullable().optional(),
    mfa_enabled: z.boolean().nullable().optional(),
    mfa_requested_at: z.string().nullable().optional(),
    avatar_thumb_url: z.string().nullable().optional(),
    time_zone: z.string().nullable().optional(),
    date_format: z.string().nullable().optional(),
    time_format: z.string().nullable().optional(),
    is_allowed_to_export: z.boolean().nullable().optional(),
    is_allowed_to_delete: z.boolean().nullable().optional(),
    is_allowed_to_send_campaigns: z.boolean().nullable().optional(),
    is_allowed_to_merge_records: z.boolean().nullable().optional(),
    is_google_apps_enabled: z.boolean().nullable().optional(),
    csv_column_separator: z.string().nullable().optional(),
    csv_decimal_mark: z.string().nullable().optional(),
    pipeline_email_client: z.boolean().nullable().optional(),
    last_seen_at: z.string().nullable().optional(),
    deleted_at: z.string().nullable().optional(),
    data_reassigned_at: z.string().nullable().optional(),
    reassign_data_to_user_id: z.number().nullable().optional(),
    w2lid: z.string().nullable().optional(),
    currency: ProviderCurrencySchema.nullable().optional(),
    other_emails: z.array(ProviderOtherEmailSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    mobile_number: z.string().optional(),
    team_id: z.number().optional(),
    manager_id: z.number().optional(),
    level: z.number().optional(),
    is_account_admin: z.boolean().optional(),
    read_only: z.boolean().optional(),
    mfa_enabled: z.boolean().optional(),
    mfa_requested_at: z.string().optional(),
    avatar_thumb_url: z.string().optional(),
    time_zone: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.string().optional(),
    is_allowed_to_export: z.boolean().optional(),
    is_allowed_to_delete: z.boolean().optional(),
    is_allowed_to_send_campaigns: z.boolean().optional(),
    is_allowed_to_merge_records: z.boolean().optional(),
    is_google_apps_enabled: z.boolean().optional(),
    csv_column_separator: z.string().optional(),
    csv_decimal_mark: z.string().optional(),
    pipeline_email_client: z.boolean().optional(),
    last_seen_at: z.string().optional(),
    deleted_at: z.string().optional(),
    data_reassigned_at: z.string().optional(),
    reassign_data_to_user_id: z.number().optional(),
    w2lid: z.string().optional(),
    currency: ProviderCurrencySchema.optional(),
    other_emails: z.array(ProviderOtherEmailSchema).optional()
});

const action = createAction({
    description: 'Update fields on an existing user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userPayload = {
            ...(input.email !== undefined && { email: input.email }),
            ...(input.first_name !== undefined && { first_name: input.first_name }),
            ...(input.last_name !== undefined && { last_name: input.last_name }),
            ...(input.mobile_number !== undefined && { mobile_number: input.mobile_number }),
            ...(input.team_id !== undefined && { team_id: input.team_id }),
            ...(input.manager_id !== undefined && { manager_id: input.manager_id }),
            ...(input.level !== undefined && { level: input.level }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.is_account_admin !== undefined && { is_account_admin: input.is_account_admin }),
            ...(input.read_only !== undefined && { read_only: input.read_only }),
            ...(input.mfa_enabled !== undefined && { mfa_enabled: input.mfa_enabled }),
            ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
            ...(input.date_format !== undefined && { date_format: input.date_format }),
            ...(input.time_format !== undefined && { time_format: input.time_format }),
            ...(input.is_allowed_to_export !== undefined && { is_allowed_to_export: input.is_allowed_to_export }),
            ...(input.is_allowed_to_delete !== undefined && { is_allowed_to_delete: input.is_allowed_to_delete }),
            ...(input.is_allowed_to_send_campaigns !== undefined && { is_allowed_to_send_campaigns: input.is_allowed_to_send_campaigns }),
            ...(input.is_allowed_to_merge_records !== undefined && { is_allowed_to_merge_records: input.is_allowed_to_merge_records }),
            ...(input.is_google_apps_enabled !== undefined && { is_google_apps_enabled: input.is_google_apps_enabled }),
            ...(input.csv_column_separator !== undefined && { csv_column_separator: input.csv_column_separator }),
            ...(input.csv_decimal_mark !== undefined && { csv_decimal_mark: input.csv_decimal_mark }),
            ...(input.pipeline_email_client !== undefined && { pipeline_email_client: input.pipeline_email_client })
        };

        const updateConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: `/api/v3/admin/users/${encodeURIComponent(String(input.user_id))}`,
            data: { user: userPayload },
            retries: 1
        };

        const updateResponse = await nango.put(updateConfig);

        if (updateResponse.status !== 200) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: `User update failed with status ${updateResponse.status}`,
                user_id: input.user_id
            });
        }

        const getConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: `/api/v3/admin/users/${encodeURIComponent(String(input.user_id))}`,
            retries: 3
        };

        const getResponse = await nango.get(getConfig);

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found after update',
                user_id: input.user_id
            });
        }

        const providerUser = ProviderUserSchema.parse(getResponse.data);

        return {
            id: providerUser.id,
            ...(providerUser.full_name != null && { full_name: providerUser.full_name }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.first_name != null && { first_name: providerUser.first_name }),
            ...(providerUser.last_name != null && { last_name: providerUser.last_name }),
            ...(providerUser.mobile_number != null && { mobile_number: providerUser.mobile_number }),
            ...(providerUser.team_id != null && { team_id: providerUser.team_id }),
            ...(providerUser.manager_id != null && { manager_id: providerUser.manager_id }),
            ...(providerUser.level != null && { level: providerUser.level }),
            ...(providerUser.is_account_admin != null && { is_account_admin: providerUser.is_account_admin }),
            ...(providerUser.read_only != null && { read_only: providerUser.read_only }),
            ...(providerUser.mfa_enabled != null && { mfa_enabled: providerUser.mfa_enabled }),
            ...(providerUser.mfa_requested_at != null && { mfa_requested_at: providerUser.mfa_requested_at }),
            ...(providerUser.avatar_thumb_url != null && { avatar_thumb_url: providerUser.avatar_thumb_url }),
            ...(providerUser.time_zone != null && { time_zone: providerUser.time_zone }),
            ...(providerUser.date_format != null && { date_format: providerUser.date_format }),
            ...(providerUser.time_format != null && { time_format: providerUser.time_format }),
            ...(providerUser.is_allowed_to_export != null && { is_allowed_to_export: providerUser.is_allowed_to_export }),
            ...(providerUser.is_allowed_to_delete != null && { is_allowed_to_delete: providerUser.is_allowed_to_delete }),
            ...(providerUser.is_allowed_to_send_campaigns != null && { is_allowed_to_send_campaigns: providerUser.is_allowed_to_send_campaigns }),
            ...(providerUser.is_allowed_to_merge_records != null && { is_allowed_to_merge_records: providerUser.is_allowed_to_merge_records }),
            ...(providerUser.is_google_apps_enabled != null && { is_google_apps_enabled: providerUser.is_google_apps_enabled }),
            ...(providerUser.csv_column_separator != null && { csv_column_separator: providerUser.csv_column_separator }),
            ...(providerUser.csv_decimal_mark != null && { csv_decimal_mark: providerUser.csv_decimal_mark }),
            ...(providerUser.pipeline_email_client != null && { pipeline_email_client: providerUser.pipeline_email_client }),
            ...(providerUser.last_seen_at != null && { last_seen_at: providerUser.last_seen_at }),
            ...(providerUser.deleted_at != null && { deleted_at: providerUser.deleted_at }),
            ...(providerUser.data_reassigned_at != null && { data_reassigned_at: providerUser.data_reassigned_at }),
            ...(providerUser.reassign_data_to_user_id != null && { reassign_data_to_user_id: providerUser.reassign_data_to_user_id }),
            ...(providerUser.w2lid != null && { w2lid: providerUser.w2lid }),
            ...(providerUser.currency != null && { currency: providerUser.currency }),
            ...(providerUser.other_emails != null && { other_emails: providerUser.other_emails })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
