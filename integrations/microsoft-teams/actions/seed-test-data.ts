import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const MeSchema = z.object({
    id: z.string()
});

const TeamListSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.string(),
                displayName: z.string().optional()
            })
        )
        .optional()
});

const ChannelListSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.string(),
                displayName: z.string().optional(),
                membershipType: z.string().optional()
            })
        )
        .optional()
});

const ChannelSchema = z.object({
    id: z.string(),
    displayName: z.string().optional()
});

const ChatListSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.string(),
                topic: z.string().nullable().optional(),
                chatType: z.string().optional()
            })
        )
        .optional()
});

const ChatSchema = z.object({
    id: z.string(),
    topic: z.string().nullable().optional(),
    chatType: z.string().optional()
});

const AsyncOperationSchema = z.object({
    status: z.string(),
    targetResourceId: z.string().nullable().optional(),
    error: z
        .object({
            code: z.string().optional(),
            message: z.string().optional()
        })
        .nullable()
        .optional()
});

const ChatMessageSchema = z.object({
    id: z.string()
});

const UserListSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.string(),
                displayName: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    teamId: z.string(),
    standardChannelId: z.string(),
    privateChannelId: z.string(),
    messageIds: z.array(z.string()),
    replyId: z.string(),
    chatId: z.string(),
    chatMessageIds: z.array(z.string())
});

const action = createAction({
    description: 'Populate the connected Teams account with fixture data required to exercise all actions and syncs.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/seed-test-data'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'User.Read',
        'User.ReadBasic.All',
        'User.Read.All',
        'Team.ReadBasic.All',
        'Team.Create',
        'Channel.Create',
        'ChannelMessage.Send',
        'Chat.Create',
        'ChatMessage.Send'
    ],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const runStep = async <T>(stepName: string, fn: () => Promise<T>): Promise<T> => {
            /* @allowTryCatch
             * We catch provider errors and re-throw them as ActionErrors so the caller
             * receives a clear step label instead of an opaque stack trace. */
            try {
                return await fn();
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new nango.ActionError({
                    type: stepName,
                    message
                });
            }
        };

        const meResponse = await nango.get({
            // https://learn.microsoft.com/graph/api/user-get
            endpoint: '/v1.0/me',
            retries: 3
        });
        const me = MeSchema.parse(meResponse.data);
        const callerUserId = me.id;

        const usersResponse = await nango.get({
            // https://learn.microsoft.com/graph/api/user-list
            endpoint: '/v1.0/users',
            params: {
                $top: '2'
            },
            retries: 3
        });
        const usersList = UserListSchema.parse(usersResponse.data);
        const otherUser = usersList.value?.find((u) => u.id !== callerUserId);
        if (!otherUser) {
            throw new nango.ActionError({
                type: 'resolve_other_user_failed',
                message: 'Could not find another user in the directory to add to the group chat'
            });
        }

        const teamId = await runStep('create_team', async () => {
            const existingTeamsResponse = await nango.get({
                // https://learn.microsoft.com/graph/api/teams-list
                endpoint: '/v1.0/teams',
                params: {
                    $filter: "displayName eq 'Nango Test Team'",
                    $top: '10'
                },
                retries: 3
            });
            const existingTeams = TeamListSchema.parse(existingTeamsResponse.data);
            const existingTeam = existingTeams.value?.find((t) => t.displayName === 'Nango Test Team');
            if (existingTeam) {
                return existingTeam.id;
            }

            const createTeamResponse = await nango.post({
                // https://learn.microsoft.com/graph/api/team-post
                endpoint: '/v1.0/teams',
                data: {
                    'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
                    displayName: 'Nango Test Team',
                    description: 'Seeded by seed-test-data'
                },
                retries: 10
            });

            if (createTeamResponse.status !== 200 && createTeamResponse.status !== 202) {
                throw new Error(`Unexpected status ${createTeamResponse.status} when creating team`);
            }

            let location = createTeamResponse.headers['location'];
            if (typeof location === 'string') {
                const baseUrl = 'https://graph.microsoft.com';
                if (location.startsWith(baseUrl)) {
                    location = location.slice(baseUrl.length);
                }
                if (!location.startsWith('/v1.0')) {
                    location = `/v1.0${location}`;
                }

                let operationStatus = '';
                let asyncOpData: z.infer<typeof AsyncOperationSchema> | null = null;
                for (let attempt = 0; attempt < 10; attempt += 1) {
                    const delay = Math.min(3000 * (attempt + 1), 30000);
                    await new Promise((resolve) => {
                        setTimeout(resolve, delay);
                    });

                    const opResponse = await nango.get({
                        // https://learn.microsoft.com/graph/api/teamsasyncoperation-get
                        endpoint: location,
                        retries: 3
                    });
                    asyncOpData = AsyncOperationSchema.parse(opResponse.data);
                    operationStatus = asyncOpData.status;

                    if (operationStatus === 'succeeded') {
                        break;
                    }
                    if (operationStatus === 'failed') {
                        throw new Error(`Team async operation failed: ${asyncOpData.error?.message || 'unknown error'}`);
                    }
                }

                if (operationStatus !== 'succeeded') {
                    throw new Error(`Team async operation did not succeed after 10 polls. Last status: ${operationStatus}`);
                }
            }

            let team: { id: string } | undefined;
            for (let attempt = 0; attempt < 5; attempt += 1) {
                const teamListResponse = await nango.get({
                    // https://learn.microsoft.com/graph/api/teams-list
                    endpoint: '/v1.0/teams',
                    params: {
                        $filter: "displayName eq 'Nango Test Team'",
                        $top: '10'
                    },
                    retries: 3
                });
                const teamList = TeamListSchema.parse(teamListResponse.data);
                team = teamList.value?.find((t) => t.displayName === 'Nango Test Team');
                if (team) {
                    break;
                }
                await new Promise((resolve) => {
                    setTimeout(resolve, 3000);
                });
            }

            if (!team) {
                throw new Error('Created team not found via $filter');
            }

            return team.id;
        });

        const standardChannelId = await runStep('create_standard_channel', async () => {
            const channelsResponse = await nango.get({
                // https://learn.microsoft.com/graph/api/channel-list
                endpoint: `/v1.0/teams/${teamId}/channels`,
                retries: 3
            });
            const channels = ChannelListSchema.parse(channelsResponse.data);
            const existingStandard = channels.value?.find((c) => c.displayName === 'General Seed');
            if (existingStandard) {
                return existingStandard.id;
            }

            const createStandardResponse = await nango.post({
                // https://learn.microsoft.com/graph/api/channel-post
                endpoint: `/v1.0/teams/${teamId}/channels`,
                data: {
                    displayName: 'General Seed',
                    membershipType: 'standard'
                },
                retries: 10
            });
            const standardChannel = ChannelSchema.parse(createStandardResponse.data);
            return standardChannel.id;
        });

        const privateChannelId = await runStep('create_private_channel', async () => {
            const channelsResponse = await nango.get({
                // https://learn.microsoft.com/graph/api/channel-list
                endpoint: `/v1.0/teams/${teamId}/channels`,
                retries: 3
            });
            const channels = ChannelListSchema.parse(channelsResponse.data);
            const existingPrivate = channels.value?.find((c) => c.displayName === 'Private Seed');
            if (existingPrivate) {
                return existingPrivate.id;
            }

            const createPrivateResponse = await nango.post({
                // https://learn.microsoft.com/graph/api/channel-post
                endpoint: `/v1.0/teams/${teamId}/channels`,
                data: {
                    displayName: 'Private Seed',
                    membershipType: 'private',
                    members: [
                        {
                            '@odata.type': '#microsoft.graph.aadUserConversationMember',
                            roles: ['owner'],
                            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${callerUserId}')`
                        }
                    ]
                },
                retries: 10
            });
            const privateChannel = ChannelSchema.parse(createPrivateResponse.data);
            return privateChannel.id;
        });

        const messageIds = await runStep('create_channel_messages', async () => {
            const bodies = ['<p>First seed message</p>', '<p>Second seed message</p>', '<p>Third seed message</p>'];
            const ids: string[] = [];
            for (const body of bodies) {
                const msgResponse = await nango.post({
                    // https://learn.microsoft.com/graph/api/channel-post-messages
                    endpoint: `/v1.0/teams/${teamId}/channels/${standardChannelId}/messages`,
                    data: {
                        body: {
                            contentType: 'html',
                            content: body
                        }
                    },
                    retries: 10
                });
                const msg = ChatMessageSchema.parse(msgResponse.data);
                ids.push(msg.id);
            }
            return ids;
        });

        const replyId = await runStep('create_channel_reply', async () => {
            if (messageIds.length === 0) {
                throw new Error('No channel messages available to reply to');
            }
            const replyResponse = await nango.post({
                // https://learn.microsoft.com/graph/api/channel-post-messagereply
                endpoint: `/v1.0/teams/${teamId}/channels/${standardChannelId}/messages/${messageIds[0]}/replies`,
                data: {
                    body: {
                        contentType: 'html',
                        content: '<p>Seed reply</p>'
                    }
                },
                retries: 10
            });
            const reply = ChatMessageSchema.parse(replyResponse.data);
            return reply.id;
        });

        const chatId = await runStep('create_group_chat', async () => {
            const chatsResponse = await nango.get({
                // https://learn.microsoft.com/graph/api/chat-list
                endpoint: '/v1.0/chats',
                params: {
                    $top: '50'
                },
                retries: 3
            });
            const chats = ChatListSchema.parse(chatsResponse.data);
            const existingChat = chats.value?.find((c) => c.chatType === 'group' && c.topic === 'Nango Seed Chat');
            if (existingChat) {
                return existingChat.id;
            }

            const createChatResponse = await nango.post({
                // https://learn.microsoft.com/graph/api/chat-post
                endpoint: '/v1.0/chats',
                data: {
                    chatType: 'group',
                    topic: 'Nango Seed Chat',
                    members: [
                        {
                            '@odata.type': '#microsoft.graph.aadUserConversationMember',
                            roles: ['owner'],
                            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${callerUserId}')`
                        },
                        {
                            '@odata.type': '#microsoft.graph.aadUserConversationMember',
                            roles: ['owner'],
                            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${otherUser.id}')`
                        }
                    ]
                },
                retries: 10
            });
            const chat = ChatSchema.parse(createChatResponse.data);
            return chat.id;
        });

        const chatMessageIds = await runStep('create_chat_messages', async () => {
            const bodies = ['<p>First seed chat message</p>', '<p>Second seed chat message</p>'];
            const ids: string[] = [];
            for (const body of bodies) {
                const chatMsgResponse = await nango.post({
                    // https://learn.microsoft.com/graph/api/chatmessage-post
                    endpoint: `/v1.0/chats/${chatId}/messages`,
                    data: {
                        body: {
                            contentType: 'html',
                            content: body
                        }
                    },
                    retries: 10
                });
                const chatMsg = ChatMessageSchema.parse(chatMsgResponse.data);
                ids.push(chatMsg.id);
            }
            return ids;
        });

        return {
            teamId,
            standardChannelId,
            privateChannelId,
            messageIds,
            replyId,
            chatId,
            chatMessageIds
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
