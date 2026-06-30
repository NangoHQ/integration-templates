import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string(),
    email: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    status: z.number().optional(),
    warmup_status: z.number().optional(),
    provider_code: z.number().optional(),
    organization: z.string().optional(),
    daily_limit: z.number().optional(),
    daily_limit_max: z.number().optional(),
    warmup_limit_max: z.number().optional(),
    stat_warmup_score: z.number().optional(),
    setup_pending: z.boolean().optional(),
    is_managed_account: z.boolean().optional(),
    is_ready_made_account: z.boolean().optional(),
    dfy_password_changed: z.boolean().optional(),
    tracking_domain_name: z.string().optional(),
    tracking_domain_status: z.string().optional(),
    reply_to: z.string().optional(),
    signature: z.string().optional(),
    sending_gap: z.number().optional(),
    enable_slow_ramp: z.boolean().optional(),
    inbox_placement_test_limit: z.number().optional(),
    timestamp_last_used: z.string().optional(),
    timestamp_warmup_start: z.string().optional(),
    warmup_pool_id: z.string().optional(),
    added_by: z.string().optional(),
    modified_by: z.string().optional(),
    status_message: z.record(z.string(), z.unknown()).optional()
});

const ProviderAccountSchema = z.object({
    email: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    status: z.number().optional(),
    warmup_status: z.number().optional(),
    provider_code: z.number().optional(),
    organization: z.string().optional(),
    daily_limit: z.number().nullable(),
    daily_limit_max: z.number().nullable(),
    warmup_limit_max: z.number().nullable(),
    stat_warmup_score: z.number().nullable(),
    setup_pending: z.boolean().optional(),
    is_managed_account: z.boolean().optional(),
    is_ready_made_account: z.boolean().nullable(),
    dfy_password_changed: z.boolean().nullable(),
    tracking_domain_name: z.string().nullable(),
    tracking_domain_status: z.string().nullable(),
    reply_to: z.string().nullable(),
    signature: z.string().nullable(),
    sending_gap: z.number().optional(),
    enable_slow_ramp: z.boolean().nullable(),
    inbox_placement_test_limit: z.number().nullable(),
    timestamp_last_used: z.string().nullable(),
    timestamp_warmup_start: z.string().nullable(),
    warmup_pool_id: z.string().nullable(),
    added_by: z.string().nullable(),
    modified_by: z.string().nullable(),
    status_message: z.record(z.string(), z.unknown()).nullable()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync email sending accounts',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/accounts' }],
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const startingAfter = checkpoint ? checkpoint['starting_after'] : undefined;
        let nextCursor: string | undefined;

        for await (const page of nango.paginate({
            // https://developer.instantly.ai/api-reference/account/list-account
            endpoint: '/v2/accounts',
            ...(startingAfter ? { params: { starting_after: startingAfter } } : {}),
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }: { nextPageParam?: string | number | undefined }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected response: page is not an array');
            }

            const accounts = page.map((item: unknown) => {
                const parsed = ProviderAccountSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse account: ${parsed.error.message}`);
                }

                const raw = parsed.data;

                return {
                    id: raw.email,
                    email: raw.email,
                    timestamp_created: raw.timestamp_created,
                    timestamp_updated: raw.timestamp_updated,
                    first_name: raw.first_name,
                    last_name: raw.last_name,
                    ...(raw.status !== undefined && { status: raw.status }),
                    ...(raw.warmup_status !== undefined && { warmup_status: raw.warmup_status }),
                    ...(raw.provider_code !== undefined && { provider_code: raw.provider_code }),
                    ...(raw.organization !== undefined && { organization: raw.organization }),
                    ...(raw.daily_limit != null && { daily_limit: raw.daily_limit }),
                    ...(raw.daily_limit_max != null && { daily_limit_max: raw.daily_limit_max }),
                    ...(raw.warmup_limit_max != null && { warmup_limit_max: raw.warmup_limit_max }),
                    ...(raw.stat_warmup_score != null && { stat_warmup_score: raw.stat_warmup_score }),
                    ...(raw.setup_pending !== undefined && { setup_pending: raw.setup_pending }),
                    ...(raw.is_managed_account !== undefined && { is_managed_account: raw.is_managed_account }),
                    ...(raw.is_ready_made_account != null && { is_ready_made_account: raw.is_ready_made_account }),
                    ...(raw.dfy_password_changed != null && { dfy_password_changed: raw.dfy_password_changed }),
                    ...(raw.tracking_domain_name != null && { tracking_domain_name: raw.tracking_domain_name }),
                    ...(raw.tracking_domain_status != null && { tracking_domain_status: raw.tracking_domain_status }),
                    ...(raw.reply_to != null && { reply_to: raw.reply_to }),
                    ...(raw.signature != null && { signature: raw.signature }),
                    ...(raw.sending_gap !== undefined && { sending_gap: raw.sending_gap }),
                    ...(raw.enable_slow_ramp != null && { enable_slow_ramp: raw.enable_slow_ramp }),
                    ...(raw.inbox_placement_test_limit != null && { inbox_placement_test_limit: raw.inbox_placement_test_limit }),
                    ...(raw.timestamp_last_used != null && { timestamp_last_used: raw.timestamp_last_used }),
                    ...(raw.timestamp_warmup_start != null && { timestamp_warmup_start: raw.timestamp_warmup_start }),
                    ...(raw.warmup_pool_id != null && { warmup_pool_id: raw.warmup_pool_id }),
                    ...(raw.added_by != null && { added_by: raw.added_by }),
                    ...(raw.modified_by != null && { modified_by: raw.modified_by }),
                    ...(raw.status_message != null && { status_message: raw.status_message })
                };
            });

            if (accounts.length === 0) {
                continue;
            }

            await nango.batchSave(accounts, 'Account');

            if (nextCursor) {
                await nango.saveCheckpoint({ starting_after: nextCursor });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
