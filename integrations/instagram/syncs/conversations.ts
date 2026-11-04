import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ParticipantSchema = z
    .object({
        id: z.string().describe('Instagram-scoped ID (IGSID) of the participant'),
        username: z.string().optional().describe('Instagram username of the participant')
    })
    .describe('A participant in an Instagram Direct conversation');

const MessageSchema = z
    .object({
        id: z.string().describe('Unique identifier of the message'),
        created_time: z.string().optional().describe('ISO 8601 timestamp when the message was sent'),
        from: ParticipantSchema.optional().describe('Sender of the message'),
        message: z.string().optional().describe('Text content of the message')
    })
    .describe('A message in an Instagram Direct conversation');

const ConversationSchema = z
    .object({
        id: z.string().describe('Unique identifier of the Instagram Direct conversation'),
        updated_time: z.string().optional().describe('ISO 8601 timestamp when the conversation was last updated'),
        participants: z
            .object({
                data: z.array(ParticipantSchema).describe('Participants in the conversation')
            })
            .optional()
            .describe('Participants in the conversation'),
        messages: z
            .object({
                data: z.array(MessageSchema).describe('Most recent messages in the conversation')
            })
            .optional()
            .describe('Most recent message preview for the conversation, newest first')
    })
    .describe('An Instagram Direct conversation between the connected business account and one or more participants');

const ProviderParticipantSchema = z.object({
    id: z.string(),
    username: z.string().nullish()
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    created_time: z.string().nullish(),
    from: ProviderParticipantSchema.nullish(),
    message: z.string().nullish()
});

const ProviderConversationSchema = z.object({
    id: z.string(),
    updated_time: z.string().nullish(),
    participants: z
        .object({
            data: z.array(ProviderParticipantSchema)
        })
        .nullish(),
    messages: z
        .object({
            data: z.array(ProviderMessageSchema)
        })
        .nullish()
});

type Participant = z.infer<typeof ParticipantSchema>;
type Conversation = z.infer<typeof ConversationSchema>;

function toParticipant(participant: z.infer<typeof ProviderParticipantSchema>): Participant {
    return {
        id: participant.id,
        ...(participant.username != null && { username: participant.username })
    };
}

function toConversation(conversation: z.infer<typeof ProviderConversationSchema>): Conversation {
    return {
        id: conversation.id,
        ...(conversation.updated_time != null && { updated_time: conversation.updated_time }),
        ...(conversation.participants != null && { participants: { data: conversation.participants.data.map(toParticipant) } }),
        ...(conversation.messages != null && {
            messages: {
                data: conversation.messages.data.map((message) => ({
                    id: message.id,
                    ...(message.created_time != null && { created_time: message.created_time }),
                    ...(message.from != null && { from: toParticipant(message.from) }),
                    ...(message.message != null && { message: message.message })
                }))
            }
        })
    };
}

const CheckpointSchema = z
    .object({
        cursor: z.string().describe('Cursor for the next conversations page when resuming an interrupted full refresh.')
    })
    .describe('Resume cursor for the conversations full refresh.');

const sync = createSync({
    description: 'Sync Instagram Direct conversations for the connected business account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Conversation: ConversationSchema
    },
    scopes: ['instagram_business_basic', 'instagram_business_manage_messages'],

    exec: async (nango) => {
        // Blocker: /me/conversations exposes no documented incremental filter, so this
        // sync always performs a full refresh and relies on delete tracking. The
        // checkpoint only resumes cursor pagination mid-refresh after interruptions.
        const checkpoint = await nango.getCheckpoint();
        const storedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const resumeCursor = storedCheckpoint.success && storedCheckpoint.data.cursor ? storedCheckpoint.data.cursor : undefined;
        let nextCursor: string | undefined;
        let checkpointSaved = false;

        await nango.trackDeletesStart('Conversation');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/conversations-api
            endpoint: '/me/conversations',
            params: {
                platform: 'instagram',
                fields: 'id,updated_time,participants,messages.limit(1){id,created_time,from,message}',
                ...(resumeCursor ? { after: resumeCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'paging.cursors.after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const conversations = z.array(ProviderConversationSchema).parse(page).map(toConversation);

            if (conversations.length > 0) {
                await nango.batchSave(conversations, 'Conversation');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
                checkpointSaved = true;
            }
        }

        // Deleting a checkpoint that was never written (e.g. a single-page run starting from
        // scratch) fails with checkpoint_conflict.
        if (checkpoint != null || checkpointSaved) {
            await nango.clearCheckpoint();
        }
        await nango.trackDeletesEnd('Conversation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
