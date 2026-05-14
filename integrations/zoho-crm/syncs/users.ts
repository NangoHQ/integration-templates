import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Normalized sync model (snake_case per Zoho API style)
const UserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string(),
    role_id: z.string().optional(),
    role_name: z.string().optional(),
    profile_id: z.string().optional(),
    profile_name: z.string().optional(),
    status: z.string(),
    created_time: z.string(),
    modified_time: z.string().optional(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    locale: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    country_locale: z.string().optional(),
    website: z.string().optional(),
    dob: z.string().optional(),
    alias: z.string().optional(),
    signature: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.string().optional(),
    zuid: z.string().optional(),
    confirm: z.boolean().optional(),
    microsoft: z.boolean().optional(),
    personal_account: z.boolean().optional(),
    is_online: z.boolean().optional(),
    reporting_to_id: z.string().optional(),
    reporting_to_name: z.string().optional(),
    created_by_id: z.string().optional(),
    created_by_name: z.string().optional(),
    modified_by_id: z.string().optional(),
    modified_by_name: z.string().optional()
});

// Checkpoint schema - fields must be non-optional for ZodCheckpoint type
const CheckpointSchema = z.object({
    modified_since: z.string()
});

type ProviderUserType = {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    email: string;
    role?: { name: string; id: string } | null;
    profile?: { name: string; id: string } | null;
    status: string;
    created_time: string;
    Modified_Time?: string | null;
    time_zone?: string | null;
    language?: string | null;
    locale?: string | null;
    phone?: string | null;
    mobile?: string | null;
    fax?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
    country_locale?: string | null;
    website?: string | null;
    dob?: string | null;
    alias?: string | null;
    signature?: string | null;
    date_format?: string | null;
    time_format?: string | null;
    zuid?: string | null;
    confirm?: boolean | null;
    microsoft?: boolean | null;
    personal_account?: boolean | null;
    Isonline?: boolean | null;
    Reporting_To?: { name: string; id: string } | null;
    created_by?: { name: string; id: string } | null;
    Modified_By?: { name: string; id: string } | null;
    territories?: Array<{ manager: boolean; name: string; id: string }> | null;
};

type UserType = z.infer<typeof UserSchema>;

const sync = createSync({
    description: 'Sync users from Zoho CRM',
    version: '1.0.0',
    endpoints: [{ path: '/syncs/users', method: 'GET' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const modifiedSince = checkpoint?.modified_since;

        // Build headers conditionally
        const headers: Record<string, string> = {};
        if (modifiedSince) {
            headers['If-Modified-Since'] = modifiedSince;
        }

        // Fetch all modified users (Active + Inactive)
        // https://www.zoho.com/crm/developer/docs/api/v2/get-users.html
        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-users.html
            endpoint: '/crm/v2/users',
            params: {
                type: 'AllUsers',
                page: 1,
                per_page: 200
            },
            ...(Object.keys(headers).length > 0 && { headers }),
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'users'
            },
            retries: 3
        };

        let lastModifiedTime: string | undefined;

        for await (const users of nango.paginate<ProviderUserType>(proxyConfig)) {
            const normalizedUsers = users.map((user) => {
                const normalized: UserType = {
                    id: user.id,
                    email: user.email,
                    status: user.status,
                    created_time: user.created_time,
                    ...(user.first_name != null && { first_name: user.first_name }),
                    ...(user.last_name != null && { last_name: user.last_name }),
                    ...(user.full_name != null && { full_name: user.full_name }),
                    ...(user.role && { role_id: user.role.id, role_name: user.role.name }),
                    ...(user.profile && { profile_id: user.profile.id, profile_name: user.profile.name }),
                    ...(user.Modified_Time != null && { modified_time: user.Modified_Time }),
                    ...(user.time_zone != null && { time_zone: user.time_zone }),
                    ...(user.language != null && { language: user.language }),
                    ...(user.locale != null && { locale: user.locale }),
                    ...(user.phone != null && { phone: user.phone }),
                    ...(user.mobile != null && { mobile: user.mobile }),
                    ...(user.fax != null && { fax: user.fax }),
                    ...(user.street != null && { street: user.street }),
                    ...(user.city != null && { city: user.city }),
                    ...(user.state != null && { state: user.state }),
                    ...(user.country != null && { country: user.country }),
                    ...(user.zip != null && { zip: user.zip }),
                    ...(user.country_locale != null && { country_locale: user.country_locale }),
                    ...(user.website != null && { website: user.website }),
                    ...(user.dob != null && { dob: user.dob }),
                    ...(user.alias != null && { alias: user.alias }),
                    ...(user.signature != null && { signature: user.signature }),
                    ...(user.date_format != null && { date_format: user.date_format }),
                    ...(user.time_format != null && { time_format: user.time_format }),
                    ...(user.zuid != null && { zuid: user.zuid }),
                    ...(user.confirm != null && { confirm: user.confirm }),
                    ...(user.microsoft != null && { microsoft: user.microsoft }),
                    ...(user.personal_account != null && { personal_account: user.personal_account }),
                    ...(user.Isonline != null && { is_online: user.Isonline }),
                    ...(user.Reporting_To && {
                        reporting_to_id: user.Reporting_To.id,
                        reporting_to_name: user.Reporting_To.name
                    }),
                    ...(user.created_by && {
                        created_by_id: user.created_by.id,
                        created_by_name: user.created_by.name
                    }),
                    ...(user.Modified_By && {
                        modified_by_id: user.Modified_By.id,
                        modified_by_name: user.Modified_By.name
                    })
                };

                // Track the latest modified time for checkpointing
                if (user.Modified_Time) {
                    if (!lastModifiedTime || user.Modified_Time > lastModifiedTime) {
                        lastModifiedTime = user.Modified_Time;
                    }
                }

                return normalized;
            });

            if (normalizedUsers.length > 0) {
                await nango.batchSave(normalizedUsers, 'User');
            }
        }

        // Fetch deleted users separately using the same checkpoint
        // https://www.zoho.com/crm/developer/docs/api/v2/get-users.html
        if (modifiedSince) {
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-users.html
                endpoint: '/crm/v2/users',
                params: {
                    type: 'DeletedUsers',
                    page: 1,
                    per_page: 200
                },
                headers: { 'If-Modified-Since': modifiedSince },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'users'
                },
                retries: 3
            };

            const deletedUserIds: Array<{ id: string }> = [];

            for await (const deletedUsers of nango.paginate<ProviderUserType>(deletedProxyConfig)) {
                for (const user of deletedUsers) {
                    deletedUserIds.push({ id: user.id });
                }
            }

            if (deletedUserIds.length > 0) {
                await nango.batchDelete(deletedUserIds, 'User');
            }
        }

        // Save checkpoint with the latest modified time
        // Using current time if no modified time found, to ensure we don't miss future updates
        const newCheckpointTime = lastModifiedTime ?? new Date().toISOString();
        await nango.saveCheckpoint({
            modified_since: newCheckpointTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
