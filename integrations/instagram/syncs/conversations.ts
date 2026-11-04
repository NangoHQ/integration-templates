import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ParticipantSchema = z
    .object({
        id: z.string().describe('Instagram-scoped ID (IGSID) of the participant'),
        username: z.string().nullable().optional().describe('Instagram username of the participant')
    })
    .describe('A participant in an Instagram Direct conversation');

const MessageSchema = z
    .object({
        id: z.string().describe('Unique identifier of the message'),
        created_time: z.string().nullable().optional().describe('ISO 8601 timestamp when the message was sent'),
        from: ParticipantSchema.nullable().optional().describe('Sender of the message'),
        message: z.string().nullable().optional().describe('Text content of the message')
    })
    .describe('A message in an Instagram Direct conversation');

const ConversationSchema = z
    .object({
        id: z.string().describe('Unique identifier of the Instagram Direct conversation'),
        updated_time: z.string().nullable().optional().describe('ISO 8601 timestamp when the conversation was last updated'),
        participants: z
            .object({
                data: z.array(ParticipantSchema).describe('Participants in the conversation')
            })
            .nullable()
            .optional()
            .describe('Participants in the conversation'),
        messages: z
            .object({
                data: z.array(MessageSchema).describe('Most recent messages in the conversation')
            })
            .nullable()
            .optional()
            .describe('Most recent message preview for the conversation, newest first')
    })
    .describe('An Instagram Direct conversation between the connected business account and one or more participants');

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

    exec: async (nango) => {
        // Blocker: /me/conversations exposes no documented incremental filter, so this
        // sync always performs a full refresh and relies on delete tracking. The
        // checkpoint only resumes cursor pagination mid-refresh after interruptions.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const resumeCursor = checkpoint.success ? checkpoint.data.cursor : undefined;
        let nextCursor: string | undefined;

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
            const conversations = z.array(ConversationSchema).parse(page);

            if (conversations.length > 0) {
                await nango.batchSave(conversations, 'Conversation');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Conversation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
