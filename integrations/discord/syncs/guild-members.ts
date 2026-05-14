import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    after: z.string()
});

const MetadataSchema = z.object({
    botToken: z.string(),
    guildId: z.string()
});

const UserSchema = z.object({
    id: z.string(),
    username: z.string()
});

const GuildMemberResponseSchema = z.object({
    user: UserSchema,
    nick: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    banner: z.string().nullable().optional(),
    roles: z.array(z.string()),
    joined_at: z.string().nullable().optional(),
    premium_since: z.string().nullable().optional(),
    deaf: z.boolean(),
    mute: z.boolean(),
    flags: z.number(),
    pending: z.boolean().optional(),
    communication_disabled_until: z.string().nullable().optional()
});

const GuildMemberSchema = z.object({
    id: z.string(),
    guild_id: z.string(),
    user_id: z.string(),
    username: z.string(),
    nick: z.string().optional(),
    avatar: z.string().optional(),
    banner: z.string().optional(),
    roles: z.array(z.string()),
    joined_at: z.string().optional(),
    premium_since: z.string().optional(),
    deaf: z.boolean(),
    mute: z.boolean(),
    pending: z.boolean().optional(),
    flags: z.number(),
    communication_disabled_until: z.string().optional()
});

const sync = createSync({
    description: 'Sync guild members from Discord',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/guild-members'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        GuildMember: GuildMemberSchema
    },

    exec: async (nango) => {
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : { after: '0' };

        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadataResult.success) {
            await nango.log('Invalid metadata: missing botToken or guildId');
            return;
        }
        const metadata = metadataResult.data;

        await nango.trackDeletesStart('GuildMember');

        let after = checkpoint.after;
        const limit = 1000;
        let hasMore = true;

        try {
            while (hasMore) {
                // https://discord.com/developers/docs/resources/guild#list-guild-members
                const response = await nango.get({
                    endpoint: `/api/v10/guilds/${metadata.guildId}/members`,
                    headers: {
                        Authorization: `Bot ${metadata.botToken}`
                    },
                    params: {
                        limit,
                        after
                    },
                    retries: 3
                });

                if (!Array.isArray(response.data)) {
                    await nango.log('Unexpected response format from Discord guild members endpoint');
                    break;
                }

                const members = z.array(GuildMemberResponseSchema).parse(response.data);

                if (members.length === 0) {
                    hasMore = false;
                    break;
                }

                const records = members.map((member) => ({
                    id: member.user.id,
                    guild_id: metadata.guildId,
                    user_id: member.user.id,
                    username: member.user.username,
                    ...(member.nick != null && { nick: member.nick }),
                    ...(member.avatar != null && { avatar: member.avatar }),
                    ...(member.banner != null && { banner: member.banner }),
                    roles: member.roles,
                    ...(member.joined_at != null && { joined_at: member.joined_at }),
                    ...(member.premium_since != null && { premium_since: member.premium_since }),
                    deaf: member.deaf,
                    mute: member.mute,
                    ...(typeof member.pending === 'boolean' && { pending: member.pending }),
                    flags: member.flags,
                    ...(member.communication_disabled_until != null && { communication_disabled_until: member.communication_disabled_until })
                }));

                await nango.batchSave(records, 'GuildMember');

                if (members.length < limit) {
                    hasMore = false;
                } else {
                    const lastMember = members[members.length - 1];
                    if (!lastMember) {
                        hasMore = false;
                        break;
                    }
                    after = lastMember.user.id;
                    await nango.saveCheckpoint({ after });
                }
            }
        } finally {
            await nango.trackDeletesEnd('GuildMember');
        }

        await nango.saveCheckpoint({ after: '0' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
