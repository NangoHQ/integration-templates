import { createSync } from 'nango';
import { z } from 'zod';

const WorkspaceMemberSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        workspace_member_id: z.string()
    }),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.string()
});

const ListResponseSchema = z.object({
    data: z.array(WorkspaceMemberSchema)
});

const WorkspaceMemberModelSchema = z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable().optional(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.string()
});

const sync = createSync({
    description: 'Sync workspace member profiles from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        WorkspaceMember: WorkspaceMemberModelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/workspace-members'
        }
    ],
    scopes: ['user_management:read'],

    exec: async (nango) => {
        // Blocker: the Attio workspace members endpoint returns the complete
        // list in a single response with no changed-since filter, no cursor,
        // and no deleted-record endpoint.
        await nango.trackDeletesStart('WorkspaceMember');

        // https://docs.attio.com/rest-api/endpoint-reference/workspace-members/list-workspace-members
        const response = await nango.get({
            endpoint: '/v2/workspace_members',
            retries: 3
        });

        const parsed = ListResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid workspace members response: ${parsed.error.message}`);
        }

        const members = parsed.data.data.map((member) => ({
            id: member.id.workspace_member_id,
            first_name: member.first_name,
            last_name: member.last_name,
            ...(member.avatar_url !== null && { avatar_url: member.avatar_url }),
            email_address: member.email_address,
            created_at: member.created_at,
            access_level: member.access_level
        }));

        if (members.length > 0) {
            await nango.batchSave(members, 'WorkspaceMember');
        }

        await nango.trackDeletesEnd('WorkspaceMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
