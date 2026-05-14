import { createSync } from 'nango';
import { z } from 'zod';

// Discord Guild schema based on API response
// https://discord.com/developers/docs/resources/guild#guild-object
const GuildSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullable(),
    owner: z.boolean().optional(),
    permissions: z.string().optional(),
    permissions_new: z.string().optional(),
    features: z.array(z.string()).optional()
});

// Checkpoints must use primitive values; this sync resets to `'0'`
// between completed full refreshes.
const CheckpointSchema = z.object({
    after: z.string()
});

// Metadata schema for bot token validation
const MetadataSchema = z.object({
    botToken: z.string()
});

const sync = createSync({
    description: 'Sync guilds from Discord.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/guilds' }],
    checkpoint: CheckpointSchema,
    models: {
        Guild: GuildSchema
    },

    exec: async (nango) => {
        // Bot users can join more than 200 guilds, so use the `after` cursor to
        // make full refreshes resumable. Discord does not expose an updated-since
        // filter here, so reset the checkpoint after each completed run.
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let after = checkpointResult.success ? checkpointResult.data.after : '0';

        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('Missing or invalid botToken in connection metadata');
        }
        const metadata = metadataResult.data;

        await nango.trackDeletesStart('Guild');

        const limit = 200;

        while (true) {
            const response = await nango.get({
                // https://discord.com/developers/docs/resources/user#get-current-user-guilds
                endpoint: '/api/v10/users/@me/guilds',
                headers: {
                    Authorization: `Bot ${metadata.botToken}`
                },
                params: {
                    limit,
                    ...(after !== '0' && { after })
                },
                retries: 3
            });

            const parsedGuilds = z.array(GuildSchema).safeParse(response.data);
            if (!parsedGuilds.success) {
                throw new Error('Unexpected response format: expected array of guilds');
            }

            const guilds = parsedGuilds.data.map((record) => ({
                id: record.id,
                name: record.name,
                icon: record.icon,
                ...(record.owner !== undefined && { owner: record.owner }),
                ...(record.permissions !== undefined && { permissions: record.permissions }),
                ...(record.permissions_new !== undefined && { permissions_new: record.permissions_new }),
                ...(record.features !== undefined && { features: record.features })
            }));

            if (guilds.length > 0) {
                await nango.batchSave(guilds, 'Guild');
            }

            if (parsedGuilds.data.length < limit) {
                break;
            }

            const lastGuild = parsedGuilds.data[parsedGuilds.data.length - 1];
            if (!lastGuild) {
                break;
            }

            after = lastGuild.id;
            await nango.saveCheckpoint({ after });
        }

        await nango.trackDeletesEnd('Guild');
        await nango.saveCheckpoint({ after: '0' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
