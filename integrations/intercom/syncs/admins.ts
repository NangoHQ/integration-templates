import { createSync } from 'nango';
import { z } from 'zod';

const AdminSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    job_title: z.string().optional(),
    away_mode_enabled: z.boolean().optional(),
    away_mode_reassign: z.boolean().optional(),
    away_status_reason_id: z.number().nullable().optional(),
    has_inbox_seat: z.boolean().optional(),
    team_ids: z.array(z.number()).optional(),
    avatar: z
        .union([z.string(), z.object({}).passthrough()])
        .nullable()
        .optional(),
    team_priority_level: z.object({}).passthrough().nullable().optional()
});

const AdminListSchema = z.object({
    type: z.string().optional(),
    admins: z.array(AdminSchema).optional()
});

const sync = createSync({
    description: 'Sync admin users from Intercom',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Admin: AdminSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/admins'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Admin');
        try {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/admins/listadmins
            const response = await nango.get({
                endpoint: '/admins',
                headers: {
                    'Intercom-Version': '2.11'
                },
                retries: 3
            });

            const parsed = AdminListSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse admin list: ${parsed.error.message}`);
            }

            const admins = parsed.data.admins ?? [];
            const mappedAdmins = admins.map((admin) => ({
                id: admin.id,
                type: admin.type,
                name: admin.name,
                email: admin.email,
                job_title: admin.job_title,
                away_mode_enabled: admin.away_mode_enabled,
                away_mode_reassign: admin.away_mode_reassign,
                away_status_reason_id: admin.away_status_reason_id,
                has_inbox_seat: admin.has_inbox_seat,
                team_ids: admin.team_ids,
                avatar: admin.avatar,
                team_priority_level: admin.team_priority_level
            }));

            if (mappedAdmins.length > 0) {
                await nango.batchSave(mappedAdmins, 'Admin');
            }
        } finally {
            await nango.trackDeletesEnd('Admin');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
