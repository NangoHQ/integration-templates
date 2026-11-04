import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor from a previous response (paging.cursors.after). Omit to fetch the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of conversations to return per page (1-100).')
    })
    .describe('Pagination options for listing Instagram Direct conversations.');

const ParticipantSchema = z.object({
    id: z.string().describe('Instagram-scoped ID of the conversation participant.'),
    username: z.string().optional().describe('Instagram username of the participant, when available.')
});

const ConversationSchema = z.object({
    id: z.string().describe('Unique identifier of the Instagram Direct conversation.'),
    updated_time: z.string().optional().describe('Time the most recent message was added to the conversation, as returned by Instagram.'),
    participants: z.array(ParticipantSchema).optional().describe('Participants in the conversation, when Instagram returns them.')
});

const OutputSchema = z
    .object({
        items: z.array(ConversationSchema).describe('Conversations returned for this page, most recent first.'),
        next_cursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of Instagram Direct conversations and the cursor for the next page.');

const ProviderParticipantSchema = z.object({
    id: z.string(),
    username: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const ProviderConversationSchema = z.object({
    id: z.string(),
    updated_time: z.string().nullable().optional(),
    participants: z
        .object({
            data: z.array(ProviderParticipantSchema).optional()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderConversationSchema).optional(),
    paging: z
        .object({
            cursors: z
                .object({
                    after: z.string().nullable().optional(),
                    before: z.string().nullable().optional()
                })
                .optional(),
            next: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists Instagram Direct conversations without modifying any provider data.
 * @pitfalls: Requires an Instagram professional (Business or Creator) account; an empty items array is a normal success response, not an error.
 */
const action = createAction({
    description: 'List Instagram Direct conversations for the connected business account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_manage_messages'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/conversations-api
            endpoint: '/me/conversations',
            params: {
                platform: 'instagram',
                fields: 'id,updated_time,participants',
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        const items = (parsed.data ?? []).map((conversation) => {
            const participants = conversation.participants?.data?.map((participant) => ({
                id: participant.id,
                ...(participant.username != null && { username: participant.username })
            }));

            return {
                id: conversation.id,
                ...(conversation.updated_time != null && { updated_time: conversation.updated_time }),
                ...(participants != null && { participants })
            };
        });

        const nextCursor = parsed.paging?.next != null ? parsed.paging.cursors?.after : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
