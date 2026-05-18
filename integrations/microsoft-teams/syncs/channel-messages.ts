import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schema matching Microsoft Graph chatMessage response
const ChatMessageSchema = z.object({
    id: z.string(),
    replyToId: z.string().nullable().optional(),
    messageType: z.string().optional(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    lastEditedDateTime: z.string().nullable().optional(),
    deletedDateTime: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    chatId: z.string().nullable().optional(),
    importance: z.string().optional(),
    locale: z.string().optional(),
    webUrl: z.string().nullable().optional(),
    from: z
        .object({
            application: z.unknown().nullable().optional(),
            device: z.unknown().nullable().optional(),
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().nullable().optional(),
                    userIdentityType: z.string().optional()
                })
                .optional()
        })
        .nullable()
        .optional(),
    body: z
        .object({
            contentType: z.string(),
            content: z.string()
        })
        .optional(),
    channelIdentity: z
        .object({
            teamId: z.string(),
            channelId: z.string()
        })
        .optional(),
    attachments: z.array(z.unknown()).optional(),
    mentions: z.array(z.unknown()).optional(),
    reactions: z.array(z.unknown()).optional()
});

// Normalized model for the sync
const ChannelMessageSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    channelId: z.string(),
    messageType: z.string().optional(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    lastEditedDateTime: z.string().optional(),
    deletedDateTime: z.string().optional(),
    subject: z.string().optional(),
    summary: z.string().optional(),
    importance: z.string().optional(),
    locale: z.string().optional(),
    webUrl: z.string().optional(),
    contentType: z.string().optional(),
    content: z.string().optional(),
    fromUserId: z.string().optional(),
    fromUserDisplayName: z.string().optional(),
    replyToId: z.string().optional()
});

const CheckpointSchema = z.object({
    teamIndex: z.number().int().min(-1),
    channelIndex: z.number().int().min(-1),
    nextLink: z.string()
});

const ChannelMessagesResponseSchema = z.object({
    value: z.array(ChatMessageSchema),
    '@odata.nextLink': z.string().optional()
});

// Metadata schema for team and channel configuration
const MetadataSchema = z.object({
    teams: z
        .array(
            z.object({
                teamId: z.string(),
                channelIds: z.array(z.string())
            })
        )
        .optional()
});

type ChannelMessage = z.infer<typeof ChannelMessageSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync root channel messages for selected channels',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        ChannelMessage: ChannelMessageSchema
    },

    endpoints: [
        {
            method: 'POST',
            path: '/syncs/channel-messages'
        }
    ],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint: Checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { teamIndex: -1, channelIndex: -1, nextLink: '' };

        let metadataResult: unknown = null;
        try {
            metadataResult = await nango.getMetadata();
        } catch {
            metadataResult = null;
        }
        const parsedMetadata = MetadataSchema.safeParse(metadataResult);
        const metadata = parsedMetadata.success ? parsedMetadata.data : {};

        if (!metadata || !metadata.teams || metadata.teams.length === 0) {
            await nango.log('No valid metadata found with teams and channelIds configuration');
            return;
        }

        const teams = metadata.teams;

        if (teams.length === 0) {
            await nango.log('No teams configured in metadata');
            return;
        }

        const hasResumeTeam = checkpoint.teamIndex >= 0 && checkpoint.teamIndex < teams.length;
        const startTeamIndex = hasResumeTeam ? checkpoint.teamIndex : 0;
        const startChannelIndex =
            hasResumeTeam && checkpoint.channelIndex >= 0 && checkpoint.channelIndex < teams[startTeamIndex]!.channelIds.length ? checkpoint.channelIndex : 0;

        await nango.trackDeletesStart('ChannelMessage');

        for (let teamIndex = startTeamIndex; teamIndex < teams.length; teamIndex += 1) {
            const team = teams[teamIndex]!;
            const teamId = team.teamId;
            const channelIds = team.channelIds;
            const initialChannelIndex = teamIndex === startTeamIndex ? startChannelIndex : 0;

            for (let channelIndex = initialChannelIndex; channelIndex < channelIds.length; channelIndex += 1) {
                const channelId = channelIds[channelIndex]!;
                await nango.log(`Fetching messages for team ${teamId}, channel ${channelId}`);

                let nextLink: string | undefined =
                    hasResumeTeam && teamIndex === startTeamIndex && channelIndex === initialChannelIndex && checkpoint.nextLink.length > 0
                        ? checkpoint.nextLink
                        : undefined;

                do {
                    const proxyConfig: ProxyConfiguration = {
                        // https://learn.microsoft.com/graph/api/channel-list-messages
                        endpoint: nextLink || `/teams/${teamId}/channels/${channelId}/messages`,
                        retries: 3
                    };

                    if (!nextLink) {
                        proxyConfig.params = { $top: '50' };
                    }

                    const response = await nango.get(proxyConfig);
                    const parsed = ChannelMessagesResponseSchema.parse(response.data);

                    const validMessages: ChannelMessage[] = parsed.value.map((msg) => ({
                        id: msg.id,
                        teamId: msg.channelIdentity?.teamId || teamId,
                        channelId: msg.channelIdentity?.channelId || channelId,
                        messageType: msg.messageType,
                        createdDateTime: msg.createdDateTime,
                        lastModifiedDateTime: msg.lastModifiedDateTime,
                        ...(msg.lastEditedDateTime && { lastEditedDateTime: msg.lastEditedDateTime }),
                        ...(msg.deletedDateTime && { deletedDateTime: msg.deletedDateTime }),
                        ...(msg.subject && { subject: msg.subject }),
                        ...(msg.summary && { summary: msg.summary }),
                        ...(msg.importance && { importance: msg.importance }),
                        ...(msg.locale && { locale: msg.locale }),
                        ...(msg.webUrl && { webUrl: msg.webUrl }),
                        ...(msg.body?.contentType && { contentType: msg.body.contentType }),
                        ...(msg.body?.content && { content: msg.body.content }),
                        ...(msg.from?.user?.id && { fromUserId: msg.from.user.id }),
                        ...(msg.from?.user?.displayName && { fromUserDisplayName: msg.from.user.displayName }),
                        ...(msg.replyToId && { replyToId: msg.replyToId })
                    }));

                    if (validMessages.length > 0) {
                        await nango.batchSave(validMessages, 'ChannelMessage');
                        await nango.log(`Saved ${validMessages.length} messages for channel ${channelId}`);
                    }

                    nextLink = parsed['@odata.nextLink'];

                    if (nextLink) {
                        await nango.saveCheckpoint({ teamIndex, channelIndex, nextLink });
                    } else if (channelIndex < channelIds.length - 1) {
                        await nango.saveCheckpoint({ teamIndex, channelIndex: channelIndex + 1, nextLink: '' });
                    } else if (teamIndex < teams.length - 1) {
                        await nango.saveCheckpoint({ teamIndex: teamIndex + 1, channelIndex: 0, nextLink: '' });
                    }
                } while (nextLink);
            }
        }

        await nango.saveCheckpoint({ teamIndex: -1, channelIndex: -1, nextLink: '' });
        await nango.trackDeletesEnd('ChannelMessage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
