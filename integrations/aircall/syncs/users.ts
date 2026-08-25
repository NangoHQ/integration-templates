import { createSync } from 'nango';
import { z } from 'zod';

const AircallUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string(),
    language: z.string(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().optional(),
    default_number_id: z.number().nullable().optional()
});

const UserSchema = z.object({
    id: z.string(),
    direct_link: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    available: z.boolean().optional(),
    availability_status: z.string().optional(),
    created_at: z.string().optional(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().optional(),
    default_number_id: z.number().optional()
});

const ProviderUsersPageSchema = z.object({
    users: z.array(AircallUserSchema),
    meta: z
        .object({
            next_page_link: z.string().nullable().optional()
        })
        .passthrough()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync users from Aircall.',
    version: '3.0.1',
    endpoints: [{ method: 'POST', path: '/syncs/users' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointParse != null && !checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }

        const checkpoint = checkpointParse?.data;
        const perPage = 50;
        let currentPage = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('User');

        while (true) {
            const response = await nango.get<z.infer<typeof ProviderUsersPageSchema>>({
                // https://developer.aircall.io/api-references/#list-all-users-v2
                endpoint: '/v2/users',
                params: {
                    per_page: perPage,
                    page: currentPage
                },
                retries: 3
            });

            const pageParse = ProviderUsersPageSchema.safeParse(response.data);
            if (!pageParse.success) {
                throw new Error(`Failed to parse users page: ${pageParse.error.message}`);
            }

            const users = pageParse.data.users.map((user) => ({
                id: String(user.id),
                direct_link: user.direct_link,
                name: user.name,
                email: user.email,
                available: user.available,
                availability_status: user.availability_status,
                created_at: user.created_at,
                time_zone: user.time_zone,
                language: user.language,
                substatus: user.substatus,
                wrap_up_time: user.wrap_up_time,
                extension: user.extension,
                ...(user.default_number_id != null && { default_number_id: user.default_number_id })
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (pageParse.data.meta.next_page_link == null) {
                break;
            }

            currentPage += 1;
            await nango.saveCheckpoint({ page: currentPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
