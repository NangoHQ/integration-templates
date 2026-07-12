import { createSync } from 'nango';
import { z } from 'zod';

const ProviderMemberProfileSchema = z.object({
    mention_name: z.string().optional(),
    name: z.string().optional(),
    email_address: z.string().optional(),
    deactivated: z.boolean().optional(),
    is_owner: z.boolean().optional()
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    disabled: z.boolean().optional(),
    entity_type: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    profile: ProviderMemberProfileSchema.optional(),
    role: z.string().optional(),
    state: z.string().optional()
});

const MemberSchema = z.object({
    id: z.string(),
    mention_name: z.string().optional(),
    name: z.string().optional(),
    email_address: z.string().optional(),
    role: z.string().optional(),
    state: z.string().optional(),
    disabled: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync workspace members.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Member: MemberSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /api/v3/members with no changed-since
        // filter, no deleted-record endpoint, and no resumable cursor or
        // pagination. The endpoint returns a flat, unpaginated array.
        await nango.trackDeletesStart('Member');

        // https://developer.shortcut.com/api/rest/v3#List-Members
        const response = await nango.get({
            endpoint: '/api/v3/members',
            retries: 3
        });

        const rawMembers = z.array(ProviderMemberSchema).parse(response.data);

        const members = rawMembers.map((member) => ({
            id: member.id,
            ...(member.profile?.mention_name != null && { mention_name: member.profile.mention_name }),
            ...(member.profile?.name != null && { name: member.profile.name }),
            ...(member.profile?.email_address != null && { email_address: member.profile.email_address }),
            ...(member.role != null && { role: member.role }),
            ...(member.state != null && { state: member.state }),
            ...(member.disabled != null && { disabled: member.disabled }),
            ...(member.created_at != null && { created_at: member.created_at }),
            ...(member.updated_at != null && { updated_at: member.updated_at })
        }));

        if (members.length > 0) {
            await nango.batchSave(members, 'Member');
        }

        await nango.trackDeletesEnd('Member');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
