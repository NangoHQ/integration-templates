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
    admins: z.array(AdminSchema).optional(),
    pages: z
        .object({
            next: z
                .object({
                    starting_after: z.string()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync admin users from Intercom',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const checkpoint = await nango.getCheckpoint();
        let startingAfter: string | undefined;
        if (checkpoint) {
            const checkpointParsed = CheckpointSchema.safeParse(checkpoint);
            if (!checkpointParsed.success) {
                throw new Error(`Invalid checkpoint: ${checkpointParsed.error.message}`);
            }
            startingAfter = checkpointParsed.data.starting_after;
        }

        await nango.trackDeletesStart('Admin');

        let hasMore = true;
        while (hasMore) {
            const params: Record<string, string> = {};
            if (startingAfter) {
                params['starting_after'] = startingAfter;
            }

            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/admins/listadmins
            const response = await nango.get({
                endpoint: '/admins',
                headers: {
                    'Intercom-Version': '2.11'
                },
                params,
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

            const nextCursor = parsed.data.pages?.next?.starting_after;
            if (nextCursor) {
                startingAfter = nextCursor;
                await nango.saveCheckpoint({ starting_after: nextCursor });
            } else {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Admin');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
