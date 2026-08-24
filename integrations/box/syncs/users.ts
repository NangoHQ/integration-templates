import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

type User = z.infer<typeof UserSchema>;

const ModelsSchema = {
    User: UserSchema
};

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    login: z.string().optional(),
    role: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const CheckpointSchema = z.object({
    marker: z.string()
});

const sync = createSync<typeof ModelsSchema, undefined, typeof CheckpointSchema>({
    description: 'Fetches a list of users from Box. Requires an enterprise account.',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],
    checkpoint: CheckpointSchema,
    models: ModelsSchema,

    exec: async (nango) => {
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let nextMarker: string | undefined = checkpointResult.success ? checkpointResult.data.marker : undefined;

        await nango.trackDeletesStart('User');

        for await (const boxUsers of nango.paginate<User>({
            // https://developer.box.com/reference/get-users/
            endpoint: '/2.0/users',
            params: {
                usemarker: 'true',
                ...(nextMarker && { marker: nextMarker })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next_marker',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'marker',
                response_path: 'entries',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextMarker = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const users: User[] = boxUsers.map((raw) => {
                const user = ProviderUserSchema.parse(raw);
                return {
                    id: user.id,
                    ...(user.name !== undefined && { name: user.name }),
                    ...(user.login !== undefined && { login: user.login }),
                    ...(user.role !== undefined && { role: user.role }),
                    ...(user.language !== undefined && { language: user.language }),
                    ...(user.timezone !== undefined && { timezone: user.timezone }),
                    ...(user.space_amount !== undefined && { space_amount: user.space_amount }),
                    ...(user.space_used !== undefined && { space_used: user.space_used }),
                    ...(user.max_upload_size !== undefined && { max_upload_size: user.max_upload_size }),
                    ...(user.status !== undefined && { status: user.status }),
                    ...(user.job_title !== undefined && { job_title: user.job_title }),
                    ...(user.phone !== undefined && { phone: user.phone }),
                    ...(user.address !== undefined && { address: user.address }),
                    ...(user.avatar_url !== undefined && { avatar_url: user.avatar_url }),
                    ...(user.created_at !== undefined && { created_at: user.created_at }),
                    ...(user.modified_at !== undefined && { modified_at: user.modified_at })
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (nextMarker !== undefined) {
                await nango.saveCheckpoint({ marker: nextMarker });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
