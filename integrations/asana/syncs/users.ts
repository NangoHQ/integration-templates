import { createSync } from 'nango';
import { z } from 'zod';

const AsanaUserSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    photo: z
        .object({
            image_21x21: z.string().optional(),
            image_27x27: z.string().optional(),
            image_36x36: z.string().optional(),
            image_60x60: z.string().optional(),
            image_128x128: z.string().optional(),
            image_1024x1024: z.string().optional()
        })
        .nullable()
        .optional()
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    photo: z
        .object({
            image_21x21: z.string().optional(),
            image_27x27: z.string().optional(),
            image_36x36: z.string().optional(),
            image_60x60: z.string().optional(),
            image_128x128: z.string().optional(),
            image_1024x1024: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    workspace_index: z.number().int().nonnegative()
});

const MetadataSchema = z.object({
    workspace_id: z.string().optional(),
    team_id: z.string().optional()
});

type User = z.infer<typeof UserSchema>;

const sync = createSync({
    description: 'Sync users for workspaces or teams in scope.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/users' }],

    exec: async (nango) => {
        let rawMetadata: unknown;
        try {
            rawMetadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const metadata = MetadataSchema.parse(rawMetadata ?? {});
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const hasResumeCheckpoint = checkpointResult.success;
        const startIndex = checkpointResult.success ? checkpointResult.data.workspace_index : 0;

        // Blocker: Asana user objects do not expose a modified_at field, and the
        // /workspaces/{gid}/users and /teams/{gid}/users endpoints do not
        // support modified_since or any timestamp-based filtering. Therefore only
        // full refresh is possible. We use a workspace_index checkpoint to resume
        // across workspaces within a run.
        if (!hasResumeCheckpoint) {
            await nango.trackDeletesStart('User');
        }

        if (metadata.team_id) {
            for await (const page of nango.paginate<unknown>({
                // https://developers.asana.com/reference/getusersforteam
                endpoint: `/api/1.0/teams/${metadata.team_id}/users`,
                params: {
                    limit: 100,
                    opt_fields: 'name,email,photo'
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'offset',
                    cursor_path_in_response: 'next_page.offset',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            })) {
                await saveUsers(nango, page);
            }
        } else {
            let workspaceIds: string[] = [];
            if (metadata.workspace_id) {
                workspaceIds = [metadata.workspace_id];
            } else {
                const workspacesResponse = await nango.get({
                    // https://developers.asana.com/reference/getworkspaces
                    endpoint: '/api/1.0/workspaces',
                    params: { opt_fields: 'gid,name' },
                    retries: 3
                });
                const workspacesData = z
                    .object({
                        data: z.array(z.object({ gid: z.string(), name: z.string().optional() })).optional()
                    })
                    .safeParse(workspacesResponse.data);
                if (workspacesData.success && workspacesData.data.data) {
                    workspaceIds = workspacesData.data.data.filter((w) => w.name !== 'Personal Projects').map((w) => w.gid);
                }
            }

            for (let i = startIndex; i < workspaceIds.length; i++) {
                for await (const page of nango.paginate<unknown>({
                    // https://developers.asana.com/reference/getusersforworkspace
                    endpoint: `/api/1.0/workspaces/${workspaceIds[i]}/users`,
                    params: {
                        limit: 100,
                        opt_fields: 'name,email,photo'
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'offset',
                        cursor_path_in_response: 'next_page.offset',
                        response_path: 'data',
                        limit_name_in_request: 'limit',
                        limit: 100
                    },
                    retries: 3
                })) {
                    await saveUsers(nango, page);
                }

                await nango.saveCheckpoint({ workspace_index: i + 1 });
            }
        }

        await nango.trackDeletesEnd('User');
        await nango.clearCheckpoint();
    }
});

async function saveUsers(nango: NangoSyncLocal, page: unknown[]) {
    const users = page
        .map((item) => {
            const parsed = AsanaUserSchema.safeParse(item);
            if (!parsed.success) {
                return null;
            }
            const user = parsed.data;
            const mapped: User = {
                id: user.gid,
                ...(user.name != null && { name: user.name }),
                ...(user.email != null && { email: user.email }),
                ...(user.photo != null && {
                    photo: {
                        ...(user.photo.image_21x21 && { image_21x21: user.photo.image_21x21 }),
                        ...(user.photo.image_27x27 && { image_27x27: user.photo.image_27x27 }),
                        ...(user.photo.image_36x36 && { image_36x36: user.photo.image_36x36 }),
                        ...(user.photo.image_60x60 && { image_60x60: user.photo.image_60x60 }),
                        ...(user.photo.image_128x128 && { image_128x128: user.photo.image_128x128 }),
                        ...(user.photo.image_1024x1024 && { image_1024x1024: user.photo.image_1024x1024 })
                    }
                })
            };
            return mapped;
        })
        .filter((u): u is User => u !== null);

    if (users.length > 0) {
        await nango.batchSave(users, 'User');
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
