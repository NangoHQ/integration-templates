import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    is_account_admin: z.boolean().nullish(),
    level: z.number().nullish(),
    account_id: z.union([z.string(), z.number()]).nullish(),
    team_id: z.union([z.string(), z.number()]).nullish(),
    manager_id: z.union([z.string(), z.number()]).nullish(),
    updated_at: z.string().nullish(),
    last_seen_at: z.string().nullish(),
    work_phone: z.string().nullish(),
    mobile_number: z.string().nullish(),
    full_name: z.string().nullish(),
    read_only: z.boolean().nullish(),
    deleted_at: z.string().nullish()
});

const UserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    is_account_admin: z.boolean().optional(),
    level: z.number().optional(),
    account_id: z.string().optional(),
    team_id: z.string().optional(),
    manager_id: z.string().optional(),
    updated_at: z.string().optional(),
    last_seen_at: z.string().optional(),
    work_phone: z.string().optional(),
    mobile_number: z.string().optional(),
    full_name: z.string().optional(),
    read_only: z.boolean().optional(),
    deleted_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync users (team members) in this account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const users = page.map((record: unknown) => {
                const parsed = ProviderUserSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user: ${JSON.stringify(parsed.error.issues)}`);
                }

                const data = parsed.data;
                return {
                    id: String(data.id),
                    ...(data.first_name != null && { first_name: data.first_name }),
                    ...(data.last_name != null && { last_name: data.last_name }),
                    ...(data.email != null && { email: data.email }),
                    ...(data.is_account_admin != null && { is_account_admin: data.is_account_admin }),
                    ...(data.level != null && { level: data.level }),
                    ...(data.account_id != null && { account_id: String(data.account_id) }),
                    ...(data.team_id != null && { team_id: String(data.team_id) }),
                    ...(data.manager_id != null && { manager_id: String(data.manager_id) }),
                    ...(data.updated_at != null && { updated_at: data.updated_at }),
                    ...(data.last_seen_at != null && { last_seen_at: data.last_seen_at }),
                    ...(data.work_phone != null && { work_phone: data.work_phone }),
                    ...(data.mobile_number != null && { mobile_number: data.mobile_number }),
                    ...(data.full_name != null && { full_name: data.full_name }),
                    ...(data.read_only != null && { read_only: data.read_only }),
                    ...(data.deleted_at != null && { deleted_at: data.deleted_at })
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
